"""SeedScenario, run locally against in-memory stand-ins for Spark, Delta and OneLake.

The notebook's cells run with stand-ins for notebookutils, pyspark.sql and delta.tables; nothing calls Fabric or
Spark. The stand-ins implement only the calls the notebook makes, with the semantics it relies on: errorifexists
writes, Delta's insert-only merge on the key, typed columns, and notebookutils.fs files that are never overwritten,
need their folder to exist and read back through head().
"""

import copy
import csv
from datetime import date
import re
import types
import unittest

from _support import LAKEHOUSE_ID, OTHER_ID, ROOT, WORKSPACE_ID, run

LAKEHOUSE_PATH = f"abfss://{WORKSPACE_ID}@onelake.dfs.fabric.microsoft.com/{LAKEHOUSE_ID}"
TABLES = f"{LAKEHOUSE_PATH}/Tables/dbo"
FILES = f"{LAKEHOUSE_PATH}/Files"
# The default knowledge_folders entry, documents, indexes Files/documents.
DOCUMENTS = f"{FILES}/documents"
KNOWLEDGE = ROOT / "scenario" / "knowledge"
FIXTURES = ROOT / "scenario" / "data" / "fixtures"
REVIEWED = {path.name: path.read_text(encoding="utf-8") for path in sorted(KNOWLEDGE.glob("*.md")) if path.name != "README.md"}
POLICY = f"{DOCUMENTS}/CS-POL-014-delayed-order-handling-policy.md"
SO_48213 = ("SO-48213", "CUST-1001", date(2026, 11, 2), date(2026, 11, 13), "Delayed", 5, "Store fixtures, 12 pallets")
KINDS = {"STRING": ("string", str), "DATE": ("date", date), "INT": ("int", int)}


class Schema:
    """A Spark schema from the notebook's DDL: `name STRING, name DATE, name INT, ...`."""

    def __init__(self, ddl):
        self.ddl = ddl
        self.columns = re.findall(r"(\w+) (STRING|DATE|INT)", ddl)
        assert ", ".join(f"{name} {kind}" for name, kind in self.columns) == ddl, ddl
        self.names = [name for name, _ in self.columns]

    def simpleString(self):
        return "struct<" + ",".join(f"{name}:{KINDS[kind][0]}" for name, kind in self.columns) + ">"

    def check(self, row):
        assert len(row) == len(self.columns), row
        for value, (name, kind) in zip(row, self.columns):
            expected = KINDS[kind][1]
            assert type(value) is expected, f"{name} must be {expected.__name__}, not {value!r}"


class Frame:
    def __init__(self, lake, schema, rows):
        self.lake, self.schema, self.rows = lake, schema, rows

    @property
    def write(self):
        return Writer(self)

    def alias(self, name):
        assert name == "source"
        return self


class Writer:
    def __init__(self, frame):
        self.frame, self.settings = frame, []

    def format(self, name):
        self.settings.append(("format", name))
        return self

    def mode(self, name):
        self.settings.append(("mode", name))
        return self

    def save(self, path):
        assert self.settings == [("format", "delta"), ("mode", "errorifexists")], self.settings
        lake = self.frame.lake
        if lake.exists(path):
            raise RuntimeError(f"[PATH_ALREADY_EXISTS] {path}")
        lake.tables[path] = {"ddl": self.frame.schema.ddl, "rows": list(self.frame.rows)}
        lake.log.append(("create", path))


class DeltaTable:
    """delta.tables.DeltaTable over the lake's tables: isDeltaTable, forPath and an insert-only merge."""

    def __init__(self, lake, path):
        self.lake, self.path = lake, path

    @staticmethod
    def isDeltaTable(spark, path):
        return path in spark.lake.tables

    @classmethod
    def forPath(cls, spark, path):
        assert path in spark.lake.tables, path
        return cls(spark.lake, path)

    def toDF(self):
        table = self.lake.tables[self.path]
        return Frame(self.lake, Schema(table["ddl"]), list(table["rows"]))

    def alias(self, name):
        assert name == "target"
        return self

    def merge(self, source, condition):
        return Merge(self, source, condition)


class Merge:
    def __init__(self, target, source, condition):
        self.target, self.source, self.inserting = target, source, False
        self.keys = tuple(re.findall(r"target\.(\w+) = source\.\1", condition))
        assert condition == " AND ".join(f"target.{key} = source.{key}" for key in self.keys), condition

    def whenNotMatchedInsertAll(self):
        self.inserting = True
        return self

    def execute(self):
        assert self.inserting, "only whenNotMatchedInsertAll merges are insert-only"
        table = self.target.lake.tables[self.target.path]
        positions = [Schema(table["ddl"]).names.index(key) for key in self.keys]
        present = {tuple(row[index] for index in positions) for row in table["rows"]}
        inserted = 0
        for row in self.source.rows:
            key = tuple(row[index] for index in positions)
            if key not in present:
                table["rows"].append(row)
                present.add(key)
                inserted += 1
        self.target.lake.log.append(("merge", self.target.path, self.keys, inserted))


class Lake:
    """One lakehouse in memory: notebookutils.fs over its files and folders, and its Delta tables by path."""

    def __init__(self):
        self.files, self.directories, self.tables, self.log = {}, set(), {}, []
        # A put that stores something else, to prove the read-back check.
        self.corrupt = None

    def exists(self, path):
        return path in self.files or path in self.directories or path in self.tables

    def mkdirs(self, path):
        self.directories.add(path)
        self.log.append(("mkdirs", path))
        return True

    def put(self, path, content, overwrite):
        assert path.rsplit("/", 1)[0] in self.directories, f"no folder for {path}"
        if path in self.files and not overwrite:
            raise FileExistsError(path)
        self.files[path] = self.corrupt(content) if self.corrupt else content
        self.log.append(("put", path))
        return True

    def head(self, path, max_bytes):
        # notebookutils.fs.head returns at most max_bytes bytes, decoded as UTF-8.
        return self.files[path].encode("utf-8")[:max_bytes].decode("utf-8", errors="replace")

    def ls(self, path):
        assert path in self.directories, path
        prefix = path + "/"
        return [types.SimpleNamespace(name=name[len(prefix):], path=name)
                for name in sorted(self.files) if name.startswith(prefix) and "/" not in name[len(prefix):]]


class Spark:
    def __init__(self, lake):
        self.lake = lake

    def createDataFrame(self, data, schema):
        schema = Schema(schema)
        rows = [tuple(row) for row in data]
        for row in rows:
            schema.check(row)
        return Frame(self.lake, schema, rows)


def modules(lake, workspace_name="scenario-dev", lakehouse_workspace=WORKSPACE_ID):
    """notebookutils, pyspark.sql and delta.tables as SeedScenario imports them."""
    spark = Spark(lake)

    def get(name, workspace):
        if (name, workspace) != ("Scenario", WORKSPACE_ID):
            raise LookupError(f"no lakehouse {name} in workspace {workspace}")
        return types.SimpleNamespace(id=LAKEHOUSE_ID, workspaceId=lakehouse_workspace, displayName=name)

    context = {"currentWorkspaceId": WORKSPACE_ID, "currentWorkspaceName": workspace_name}
    sql = types.SimpleNamespace(SparkSession=types.SimpleNamespace(builder=types.SimpleNamespace(getOrCreate=lambda: spark)))
    tables = types.SimpleNamespace(DeltaTable=DeltaTable)
    return {"notebookutils": types.SimpleNamespace(runtime=types.SimpleNamespace(context=context),
                                                   lakehouse=types.SimpleNamespace(get=get), fs=lake),
            "pyspark": types.SimpleNamespace(sql=sql), "pyspark.sql": sql,
            "delta": types.SimpleNamespace(tables=tables), "delta.tables": tables}


def seed(lake, parameters=None, **context):
    """Every cell of SeedScenario against `lake`; returns (namespace, printed output)."""
    return run("SeedScenario", modules(lake, **context), parameters)


def seeded():
    lake = Lake()
    seed(lake)
    return lake


def fixture(name, schema):
    """A scenario/data fixture's rows, typed as the notebook's schema types them."""
    convert = {"STRING": str, "DATE": date.fromisoformat, "INT": int}
    with (FIXTURES / f"{name}.csv").open(encoding="utf-8", newline="") as handle:
        reader = csv.reader(handle)
        header = next(reader)
        assert header == schema.names, (name, header)
        return [tuple(convert[kind](value) for value, (_, kind) in zip(row, schema.columns)) for row in reader]


def writes(lake, start=0):
    return [entry for entry in lake.log[start:] if entry[0] in ("create", "put", "mkdirs")
            or (entry[0] == "merge" and entry[3])]


class SeedTests(unittest.TestCase):
    def test_a_first_run_seeds_the_reviewed_rows_and_publishes_the_reviewed_documents(self):
        lake = Lake()
        namespace, output = seed(lake)
        names = ("demo_customers", "demo_orders", "demo_shipments")
        self.assertEqual(sorted(lake.tables), [f"{TABLES}/{name}" for name in names])
        for name in names:
            table = lake.tables[f"{TABLES}/{name}"]
            self.assertEqual(table["rows"], fixture(name, Schema(table["ddl"])), name)
        self.assertIn(SO_48213, lake.tables[f"{TABLES}/demo_orders"]["rows"])
        # The notebook carries scenario/knowledge byte for byte, and publishes nothing else.
        self.assertEqual(namespace["documents"], REVIEWED)
        self.assertEqual(lake.files, {f"{DOCUMENTS}/{name}": text for name, text in REVIEWED.items()})
        self.assertEqual([entry for entry in lake.log if entry[0] == "mkdirs"], [("mkdirs", DOCUMENTS)])
        for name in REVIEWED:
            self.assertIn(f"Published Files/documents/{name}.", output)
        self.assertNotIn("did not publish", output)

    def test_a_rerun_inserts_and_writes_nothing(self):
        lake = seeded()
        before, start = copy.deepcopy((lake.files, lake.directories, lake.tables)), len(lake.log)
        _, output = seed(lake)
        self.assertEqual((lake.files, lake.directories, lake.tables), before)
        self.assertEqual(writes(lake, start), [])
        self.assertEqual([entry[1:] for entry in lake.log[start:] if entry[0] == "merge"],
                         [(f"{TABLES}/demo_customers", ("customer_id",), 0), (f"{TABLES}/demo_orders", ("order_id",), 0),
                          (f"{TABLES}/demo_shipments", ("shipment_id",), 0)])
        for name in REVIEWED:
            self.assertIn(f"Files/documents/{name} is already the reviewed version.", output)

    def test_existing_rows_are_kept_and_missing_rows_and_documents_inserted(self):
        lake = seeded()
        orders = lake.tables[f"{TABLES}/demo_orders"]["rows"]
        orders[:] = [row for row in orders if row[0] != "SO-48214"]
        orders[orders.index(SO_48213)] = SO_48213[:4] + ("In transit", 0) + SO_48213[6:]
        del lake.files[POLICY]
        start = len(lake.log)
        _, output = seed(lake)
        self.assertIn(("SO-48214", "CUST-1002", date(2026, 11, 9), date(2026, 11, 20), "In transit", 0,
                       "Seasonal toy assortment, 4 pallets"), orders)
        self.assertIn(SO_48213[:4] + ("In transit", 0) + SO_48213[6:], orders, "an existing row is never updated")
        self.assertEqual(len(orders), 5)
        self.assertEqual(lake.files[POLICY], REVIEWED["CS-POL-014-delayed-order-handling-policy.md"])
        self.assertEqual([entry for entry in writes(lake, start) if entry[0] == "put"], [("put", POLICY)])
        self.assertIn("Published Files/documents/CS-POL-014-delayed-order-handling-policy.md.", output)

    def test_a_different_published_document_stops_the_run_before_anything_is_written(self):
        for edit in (lambda text: text.replace("10%", "15%"), lambda text: text + "\nAn unreviewed addition.\n",
                     lambda text: text[:100]):
            lake = seeded()
            lake.files[POLICY] = edit(lake.files[POLICY])
            del lake.tables[f"{TABLES}/demo_shipments"]
            before, start = copy.deepcopy((lake.files, lake.tables)), len(lake.log)
            with self.subTest(edit=edit), self.assertRaisesRegex(
                    ValueError, "different version of CS-POL-014-delayed-order-handling-policy.md. Nothing was written"):
                seed(lake)
            self.assertEqual((lake.files, lake.tables), before, "neither a table nor a document is written")
            self.assertEqual(lake.log[start:], [])

    def test_a_document_that_does_not_read_back_fails_the_run(self):
        lake = Lake()
        lake.corrupt = lambda content: content.replace("Approved", "Draft")
        with self.assertRaisesRegex(RuntimeError, "did not read back as the reviewed document"):
            seed(lake)

    def test_other_files_in_the_documents_folder_are_reported_and_left_alone(self):
        lake = Lake()
        lake.directories.update({FILES, DOCUMENTS})
        lake.files[f"{DOCUMENTS}/starter.txt"] = "an earlier sample document"
        _, output = seed(lake)
        self.assertEqual(lake.files[f"{DOCUMENTS}/starter.txt"], "an earlier sample document")
        self.assertNotIn(("put", f"{DOCUMENTS}/starter.txt"), lake.log)
        self.assertNotIn(("mkdirs", DOCUMENTS), lake.log, "an existing folder is not created again")
        self.assertIn("Files/documents also holds files this notebook did not publish, which the agents can cite: "
                      "starter.txt.", output)

    def test_nothing_is_written_outside_a_dev_or_test_lakehouse_or_over_an_incompatible_table(self):
        for parameters, context, message in (
            ({}, {"workspace_name": "scenario-prod"}, "restricted to -dev/-test workspaces"),
            ({"allow_other_workspaces": "true"}, {"workspace_name": "scenario-prod"}, "must be a Boolean"),
            ({}, {"lakehouse_workspace": OTHER_ID}, "outside the current workspace"),
        ):
            lake = Lake()
            with self.subTest(parameters=parameters, context=context), self.assertRaisesRegex(ValueError, message):
                seed(lake, parameters, **context)
            self.assertEqual(lake.log, [])
        lake = Lake()
        lake.directories.add(f"{TABLES}/demo_customers")
        with self.assertRaisesRegex(ValueError, "Refusing to replace a non-Delta path"):
            seed(lake)
        lake = seeded()
        # A table seeded with text dates, as an earlier schema might have, is never rewritten.
        orders = lake.tables[f"{TABLES}/demo_orders"]
        orders["ddl"] = orders["ddl"].replace("promised_date DATE", "promised_date STRING")
        start = len(lake.log)
        with self.assertRaisesRegex(ValueError, "Existing schema differs from the seed schema: demo_orders"):
            seed(lake)
        self.assertEqual(writes(lake, start), [])
        lake = Lake()
        seed(lake, {"allow_other_workspaces": True}, workspace_name="scenario-prod")
        self.assertIn(POLICY, lake.files)


if __name__ == "__main__":
    unittest.main()
