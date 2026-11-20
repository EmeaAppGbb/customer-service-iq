"""Offline scenario checks: the data contract, fixtures, governed rules, ontology, seeder, documents and evaluation cases
agree with each other.

Run with `python3 -B -m unittest discover -s scenario/evals`. Nothing here calls Fabric, Foundry or a model: these
checks keep the reviewed sources consistent, and a passing run is not evidence that a live agent answers correctly.
The cases in cases.json are checked live through the app (README.md).
"""

import ast
import csv
from datetime import date
import json
from pathlib import Path
import re
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "scenario" / "data"
KNOWLEDGE = ROOT / "scenario" / "knowledge"
ONTOLOGY = ROOT / "workspace" / "ScenarioOntology.Ontology"
SEEDER = ROOT / "workspace" / "SeedScenario.Notebook" / "notebook-content.py"
sys.path.insert(0, str(ROOT / "scenario" / "workflows"))
import delay_rules  # noqa: E402

CONTRACT = json.loads((DATA / "contract.json").read_text(encoding="utf-8"))
CASES = json.loads((Path(__file__).parent / "cases.json").read_text(encoding="utf-8"))
SCENARIO_DATE = date.fromisoformat(CONTRACT["scenario_date"])
# Contract types as Spark DDL, the ontology's table columns and its entity properties type them.
TYPES = {"string": ("STRING", "string"), "date": ("DATE", "dateTime"), "int": ("INT", "int64")}
TOOLS = {"fabric_iq_ontology", "foundry_iq_knowledge", "web_iq_public_context", "work_iq_mail"}
MARKERS = {"D", "F", "W", "Web"}
DOCUMENT_ID = re.compile(r"\(([A-Z]+-[A-Z]+-\d{3})\)")


def typed(value, kind):
    return {"string": str, "date": date.fromisoformat, "int": int}[kind](value)


def fixtures():
    """Each table's fixture rows as dictionaries of typed values."""
    tables = {}
    for table in CONTRACT["tables"]:
        kinds = {column["name"]: column["type"] for column in table["columns"]}
        with (DATA / "fixtures" / f"{table['name']}.csv").open(encoding="utf-8", newline="") as handle:
            reader = csv.DictReader(handle)
            assert reader.fieldnames == list(kinds), (table["name"], reader.fieldnames)
            tables[table["name"]] = [{name: typed(value, kinds[name]) for name, value in row.items()} for row in reader]
    return tables


def long_date(value):
    return f"{value.day} {value.strftime('%B')} {value.year}"


def literal(node):
    """A payload literal from the seeder's source: constants, tuples, lists, dicts and date(year, month, day)."""
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, (ast.Tuple, ast.List)):
        values = [literal(element) for element in node.elts]
        return tuple(values) if isinstance(node, ast.Tuple) else values
    if isinstance(node, ast.Dict):
        return {literal(key): literal(value) for key, value in zip(node.keys, node.values)}
    if (isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "date" and not node.keywords
            and all(isinstance(argument, ast.Constant) and type(argument.value) is int for argument in node.args)):
        return date(*(argument.value for argument in node.args))
    raise ValueError(f"SeedScenario's payload holds an unexpected expression at line {node.lineno}.")


def seeded_payload():
    """SeedScenario's embedded rows by variable and its documents, read from the notebook source without running it."""
    tree = ast.parse(SEEDER.read_text(encoding="utf-8"))
    names = ("customers", "orders", "shipments", "documents")
    return {node.targets[0].id: literal(node.value) for node in tree.body
            if isinstance(node, ast.Assign) and len(node.targets) == 1
            and isinstance(node.targets[0], ast.Name) and node.targets[0].id in names}


def corpus():
    """Every fact a case may expect: fixture values (dates also as day month year), the documents and the demo mail."""
    parts = []
    for rows in fixtures().values():
        for row in rows:
            for value in row.values():
                parts.append(str(value))
                if isinstance(value, date):
                    parts.append(long_date(value))
    parts += [path.read_text(encoding="utf-8") for path in sorted(KNOWLEDGE.glob("*.md"))]
    parts.append((DATA / "work-context-mail.md").read_text(encoding="utf-8"))
    return "\n".join(parts).casefold()


def documents():
    return {path.name: path.read_text(encoding="utf-8") for path in sorted(KNOWLEDGE.glob("*.md")) if path.name != "README.md"}


def tmdl_blocks(text, keyword):
    """`keyword name` blocks of a TMDL part: name to the block's text."""
    blocks = re.split(rf"(?m)^(?:/// [^\n]*\n)?{keyword} ", text)[1:]
    return {block.split("\n", 1)[0].strip(): block for block in blocks}


class ContractAndFixtureTests(unittest.TestCase):
    def test_fixtures_honour_the_contract(self):
        tables = fixtures()
        keys = {}
        for table in CONTRACT["tables"]:
            rows = tables[table["name"]]
            self.assertTrue(rows, table["name"])
            values = [row[table["key"]] for row in rows]
            self.assertEqual(len(values), len(set(values)), f"{table['name']} keys are unique")
            keys[table["name"]] = set(values)
            for column in table["columns"]:
                for row in rows:
                    value = row[column["name"]]
                    self.assertFalse(value in (None, "") and not column["nullable"], column["name"])
                    if "allowed" in column:
                        self.assertIn(value, column["allowed"], column["name"])
                    if "pattern" in column:
                        self.assertRegex(value, column["pattern"])
                    if "minimum" in column:
                        self.assertGreaterEqual(value, column["minimum"], column["name"])
        for table in CONTRACT["tables"]:
            for column in table["columns"]:
                if "references" in column:
                    target = column["references"].split(".")[0]
                    for row in tables[table["name"]]:
                        self.assertIn(row[column["name"]], keys[target], f"{table['name']}.{column['name']}")

    def test_the_curated_values_follow_the_governed_rules(self):
        tables = fixtures()
        shipments = {}
        for shipment in tables["demo_shipments"]:
            self.assertNotIn(shipment["order_id"], shipments, "one shipment per order (DQ-04)")
            shipments[shipment["order_id"]] = shipment
            stale = delay_rules.eta_is_stale(shipment["shipment_status"], shipment["last_update"], SCENARIO_DATE)
            self.assertEqual(shipment["eta_freshness"], "Stale" if stale else "Current", shipment["shipment_id"])
        for order in tables["demo_orders"]:
            shipment = shipments.get(order["order_id"])
            expected = delay_rules.business_days_late(order["promised_date"], shipment and shipment["carrier_eta"])
            self.assertEqual(order["delay_business_days"], expected, order["order_id"])
            status = delay_rules.order_status(shipment and shipment["shipment_status"], expected)
            self.assertEqual(order["order_status"], status, order["order_id"])
            self.assertEqual(order["order_status"] == "Open", shipment is None, "an Open order has no shipment (DQ-04)")

    def test_the_rules_count_business_days_and_freshness(self):
        friday, monday = date(2026, 11, 13), date(2026, 11, 16)
        self.assertEqual(delay_rules.business_days_late(friday, date(2026, 11, 20)), 5)
        self.assertEqual(delay_rules.business_days_late(friday, monday), 1, "a weekend is not late")
        self.assertEqual(delay_rules.business_days_late(friday, friday), 0)
        self.assertEqual(delay_rules.business_days_late(monday, friday), 0, "early is on time")
        self.assertEqual(delay_rules.business_days_late(friday, None), 0, "not shipped yet")
        self.assertEqual(delay_rules.order_status("Delivered", 3), "Delivered")
        self.assertTrue(delay_rules.eta_is_stale("Delayed", monday, SCENARIO_DATE))
        self.assertFalse(delay_rules.eta_is_stale("Customs hold", date(2026, 11, 18), SCENARIO_DATE))
        self.assertFalse(delay_rules.eta_is_stale("Delivered", date(2026, 11, 10), SCENARIO_DATE))
        with self.assertRaises(ValueError):
            delay_rules.order_status("In transit", -1)
        with self.assertRaises(TypeError):
            delay_rules.business_days_late("2026-11-13", friday)


class OntologyAndSeederTests(unittest.TestCase):
    def test_the_ontology_implements_the_contract(self):
        model = (ONTOLOGY / "model.tmdl").read_text(encoding="utf-8")
        self.assertEqual(re.findall(r"(?m)^ref table (\S+)$", model), [table["name"] for table in CONTRACT["tables"]])
        self.assertEqual(re.findall(r"(?m)^ref entity (\S+)$", model), [entity["name"] for entity in CONTRACT["entities"]])
        columns = {}
        for table in CONTRACT["tables"]:
            text = (ONTOLOGY / "tables" / f"{table['name']}.tmdl").read_text(encoding="utf-8")
            found = {name: block for name, block in tmdl_blocks(text, "\tcolumn").items()}
            self.assertEqual(list(found), [column["name"] for column in table["columns"]], table["name"])
            for column in table["columns"]:
                kind = TYPES[column["type"]][1]
                self.assertIn(f"\t\tdataType: {kind}\n", found[column["name"]], column["name"])
                self.assertIn(f"\t\tsourceColumn: {column['name']}\n", found[column["name"]], column["name"])
                columns[f"{table['name']}.{column['name']}"] = kind
        for entity in CONTRACT["entities"]:
            text = (ONTOLOGY / "entities" / f"{entity['name']}.tmdl").read_text(encoding="utf-8")
            self.assertTrue(text.startswith(f"/// {entity['description']}\nentity {entity['name']}\n"), entity["name"])
            self.assertIn(f"\tbackingTable: {entity['table']}\n\tkeyProperty: {entity['key']}\n", text)
            properties = tmdl_blocks(text, "\tproperty")
            self.assertEqual(list(properties), list(entity["properties"]), entity["name"])
            for name, column in entity["properties"].items():
                source = f"{entity['table']}.{column}"
                self.assertIn(f"\t\t\tvalueColumn: {source}\n", properties[name], name)
                self.assertIn(f"\t\tdataType: {columns[source]}\n", properties[name], name)
        relationships = tmdl_blocks((ONTOLOGY / "relationships.tmdl").read_text(encoding="utf-8"), "relationship")
        entity_relationships = tmdl_blocks((ONTOLOGY / "entityRelationships.tmdl").read_text(encoding="utf-8"),
                                           "entityRelationship")
        self.assertEqual(sorted(relationships), sorted(item["name"] for item in CONTRACT["relationships"]))
        self.assertEqual(sorted(entity_relationships), sorted(item["entity_relationship"] for item in CONTRACT["relationships"]))
        for item in CONTRACT["relationships"]:
            self.assertIn(f"\tfromCardinality: {item['from_cardinality']}\n\ttoCardinality: {item['to_cardinality']}\n"
                          f"\tfromColumn: {item['from_column']}\n\ttoColumn: {item['to_column']}\n",
                          relationships[item["name"]])
            self.assertIn(f"\tfromEntity: {item['from_entity']}\n\ttoEntity: {item['to_entity']}\n"
                          f"\tbackingConfiguration\n\t\trelationship: {item['name']}\n",
                          entity_relationships[item["entity_relationship"]])

    def test_the_seeder_creates_the_contracted_tables(self):
        tree = ast.parse(SEEDER.read_text(encoding="utf-8"))
        assignment = next(node for node in ast.walk(tree) if isinstance(node, ast.Assign)
                          and getattr(node.targets[0], "id", None) == "tables")
        seeded = {element.elts[0].value: (element.elts[2].value, element.elts[3].value) for element in assignment.value.elts}
        for table in CONTRACT["tables"]:
            ddl = ", ".join(f"{column['name']} {TYPES[column['type']][0]}" for column in table["columns"])
            self.assertEqual(seeded[table["name"]], (ddl, table["key"]), table["name"])
        self.assertEqual(list(seeded), [table["name"] for table in CONTRACT["tables"]])

    def test_the_seeder_carries_exactly_the_reviewed_rows_and_documents(self):
        payload = seeded_payload()
        tables = fixtures()
        for variable, table in (("customers", "demo_customers"), ("orders", "demo_orders"), ("shipments", "demo_shipments")):
            columns = [column["name"] for column in next(item for item in CONTRACT["tables"] if item["name"] == table)["columns"]]
            self.assertEqual(payload[variable], [tuple(row[column] for column in columns) for row in tables[table]], table)
        self.assertEqual(payload["documents"], documents(), "SeedScenario publishes scenario/knowledge byte for byte")


class KnowledgeTests(unittest.TestCase):
    def test_every_document_is_attributable(self):
        readme = (KNOWLEDGE / "README.md").read_text(encoding="utf-8")
        for name, text in documents().items():
            first = text.splitlines()[0]
            document_id = DOCUMENT_ID.search(first)[1]
            self.assertTrue(name.startswith(document_id), name)
            header = text.splitlines()[2]
            version = re.search(r"Version (\d+\.\d+)", header)[1]
            effective = re.search(r"Effective (\d{1,2} \w+ \d{4})", header)[1]
            self.assertRegex(header, r"Status: Approved .* Next review \d{1,2} \w+ \d{4}$")
            self.assertRegex(text.splitlines()[3], r"^Owner: .+ \| Audience: .+ \| Classification: Internal$")
            self.assertIn("Fictional sample document", text)
            headings = re.findall(r"(?m)^## .*$", text)
            self.assertTrue(headings and all(heading.endswith(f"({document_id})") for heading in headings), name)
            self.assertRegex(readme, rf"\| \[`{re.escape(name)}`\]\({re.escape(name)}\) \| {document_id} \| {version} \| "
                                     rf"{effective} \|")

    def test_documents_are_ascii(self):
        # Search's OneLake indexer guesses the encoding of a file without a byte-order mark: it read the UTF-8
        # middle dots these headers once used as GBK and indexed Chinese characters.
        for name, text in documents().items():
            self.assertTrue(text.isascii(), f"{name} must stay ASCII so Search indexes it as written")

    def test_no_document_holds_golden_answers_or_mail(self):
        for name, text in documents().items():
            for leaked in ("SO-482", "SHP-77", "CUST-10", "Fabrikam", "Outlook"):
                self.assertNotIn(leaked, text, f"{name} must stay general guidance, not case data")


class CaseTests(unittest.TestCase):
    def test_cases_are_well_formed_and_grounded(self):
        known = corpus()
        tables = fixtures()
        entities = {entity["name"]: entity["table"] for entity in CONTRACT["entities"]}
        ids = [case["id"] for case in CASES["cases"]]
        self.assertEqual(len(ids), len(set(ids)))
        for case in CASES["cases"]:
            follow = case.get("follow_up_to")
            self.assertTrue(follow is None or follow in ids, case["id"])
            for variant in ("with_iq", "without_iq"):
                expect = case.get(variant)
                if expect is None:
                    continue
                self.assertLessEqual(set(expect.get("tools", [])) | set(expect.get("tools_never", []))
                                     | set(expect.get("tools_when_work_iq", [])), TOOLS, case["id"])
                self.assertLessEqual(set(expect.get("markers", [])) | set(expect.get("markers_when_work_iq", [])), MARKERS,
                                     case["id"])
                if variant == "without_iq":
                    self.assertEqual((expect["tools"], expect.get("markers", [])), ([], []), case["id"])
                for fact in expect.get("facts", []):
                    self.assertIn(fact.casefold(), known, f"{case['id']} expects an ungrounded fact: {fact}")
                for source in expect.get("sources", []):
                    if source.startswith("ScenarioOntology · "):
                        _, entity, key = source.split(" · ")
                        table = next(item for item in CONTRACT["tables"] if item["name"] == entities[entity])
                        self.assertIn(key, {row[table["key"]] for row in tables[table["name"]]}, source)
                    elif source != "Outlook":
                        self.assertTrue(any(name.startswith(source) for name in documents()), source)
                for tool, terms in expect.get("tool_arguments_must_not", {}).items():
                    self.assertIn(tool, TOOLS)
                    self.assertEqual(terms, "private_terms")
                if "exact_reply" in expect:
                    self.assertEqual(expect["exact_reply"], "refusal")

    def test_the_refusal_is_the_instructions_own(self):
        instructions = (ROOT / "agents" / "scenario-with-iq" / "instructions.md").read_text(encoding="utf-8")
        self.assertIn(f"reply only: {CASES['refusal']}", instructions)

    def test_every_app_sample_has_a_case_and_the_runner_asks_one_of_them(self):
        source = (ROOT / "app" / "src" / "samples.ts").read_text(encoding="utf-8")
        samples = [text.replace("\\'", "'") for text in re.findall(r"question: '((?:[^'\\]|\\.)*)'", source)]
        self.assertEqual(samples, [case["question"] for case in CASES["cases"] if case["sample"]])
        runner = (ROOT / ".github" / "skills" / "deploy-platform" / "scripts" / "deploy.py").read_text(encoding="utf-8")
        asked = re.search(r"app_question=\(\s*'Ask \"([^\"]+)\"", runner)[1]
        self.assertIn(asked, samples)

    def test_private_terms_cover_every_fixture_name_and_key(self):
        terms = CASES["private_terms"]
        for rows in fixtures().values():
            for row in rows:
                for column in ("customer_name", "customer_id", "order_id", "shipment_id", "carrier"):
                    if column in row:
                        self.assertTrue(any(term in row[column] for term in terms), row[column])


if __name__ == "__main__":
    unittest.main()
