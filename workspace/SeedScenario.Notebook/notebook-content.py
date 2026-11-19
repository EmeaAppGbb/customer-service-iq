# Fabric notebook source

# METADATA ********************

# META {
# META   "kernel_info": {
# META     "name": "synapse_pyspark"
# META   },
# META   "dependencies": {}
# META }

# MARKDOWN ********************

# # Seed the delayed-order scenario
# Run after the Scenario lakehouse is deployed. No default lakehouse attachment
# is required: the target is resolved only in this notebook's current workspace.
# Missing synthetic keys are inserted and existing rows are preserved. The reviewed
# service documents are published into Files/documents only where they are missing
# and read back; a published file with different content stops the run before
# anything is written, because a governed document is never overwritten.
# By default, only workspaces ending in -dev or -test may receive demo data.
# The rows and documents are fictional; their reviewed sources are scenario/data and
# scenario/knowledge in the repository.

# PARAMETERS CELL ********************

lakehouse_name = "Scenario"
allow_other_workspaces = False

# METADATA ********************

# META {
# META   "language": "python",
# META   "language_group": "synapse_pyspark"
# META }

# CELL ********************

from datetime import date
from uuid import UUID

import notebookutils
from delta.tables import DeltaTable
from pyspark.sql import SparkSession

context = notebookutils.runtime.context
workspace_id = str(UUID(context["currentWorkspaceId"]))
workspace_name = context["currentWorkspaceName"]

if not isinstance(workspace_name, str) or not workspace_name:
    raise ValueError("The runtime must identify the current workspace name.")
if not isinstance(lakehouse_name, str) or not lakehouse_name.strip():
    raise ValueError("lakehouse_name must name a lakehouse in the current workspace.")
if type(allow_other_workspaces) is not bool:
    raise ValueError("allow_other_workspaces must be a Boolean, not a string.")
if not workspace_name.endswith(("-dev", "-test")) and not allow_other_workspaces:
    raise ValueError(
        "Demo seeding is restricted to -dev/-test workspaces. For an intentional "
        "exception, explicitly set allow_other_workspaces=True for this run."
    )

lakehouse = notebookutils.lakehouse.get(lakehouse_name, workspace_id)
if str(UUID(lakehouse.workspaceId)) != workspace_id:
    raise ValueError("Refusing to seed a lakehouse outside the current workspace.")

lakehouse_id = str(UUID(lakehouse.id))
lakehouse_path = (
    f"abfss://{workspace_id}@onelake.dfs.fabric.microsoft.com/{lakehouse_id}"
)
spark = SparkSession.builder.getOrCreate()

# METADATA ********************

# META {
# META   "language": "python",
# META   "language_group": "synapse_pyspark"
# META }

# CELL ********************

# The reviewed payload: scenario/data/fixtures and scenario/knowledge, byte for byte.
customers = [
    ("CUST-1001", "Fabrikam Retail", "Gold"),
    ("CUST-1002", "Tailspin Toys", "Standard"),
    ("CUST-1003", "Adventure Works Cycles", "Silver"),
    ("CUST-1004", "Wide World Importers", "Gold"),
]
orders = [
    ("SO-48213", "CUST-1001", date(2026, 11, 2), date(2026, 11, 13), "Delayed", 5, "Store fixtures, 12 pallets"),
    ("SO-48214", "CUST-1002", date(2026, 11, 9), date(2026, 11, 20), "In transit", 0, "Seasonal toy assortment, 4 pallets"),
    ("SO-48215", "CUST-1003", date(2026, 11, 3), date(2026, 11, 10), "Delivered", 0, "Bicycle spare parts, 2 pallets"),
    ("SO-48216", "CUST-1001", date(2026, 11, 16), date(2026, 11, 27), "Open", 0, "Checkout counters, 6 pallets"),
    ("SO-48217", "CUST-1004", date(2026, 11, 5), date(2026, 11, 17), "Delayed", 2, "Kitchenware, 8 pallets"),
]
shipments = [
    ("SHP-7779", "SO-48215", "Consolidated Messenger", "Delivered", "Delivered and signed for",
     "Customer site", date(2026, 11, 10), date(2026, 11, 10), "Current"),
    ("SHP-7781", "SO-48213", "Consolidated Messenger", "Customs hold", "Held for a customs documentation check",
     "Eastport import hub", date(2026, 11, 18), date(2026, 11, 20), "Current"),
    ("SHP-7782", "SO-48214", "Consolidated Messenger", "In transit", "On schedule",
     "Central distribution hub", date(2026, 11, 18), date(2026, 11, 20), "Current"),
    ("SHP-7784", "SO-48217", "Consolidated Messenger", "Delayed", "Rerouted after a carrier capacity shortage",
     "Northgate depot", date(2026, 11, 16), date(2026, 11, 19), "Stale"),
]
tables = (
    ("demo_customers", customers,
     "customer_id STRING, customer_name STRING, service_tier STRING", "customer_id"),
    ("demo_orders", orders,
     "order_id STRING, customer_id STRING, order_date DATE, promised_date DATE, order_status STRING, "
     "delay_business_days INT, order_summary STRING", "order_id"),
    ("demo_shipments", shipments,
     "shipment_id STRING, order_id STRING, carrier STRING, shipment_status STRING, status_detail STRING, "
     "current_location STRING, last_update DATE, carrier_eta DATE, eta_freshness STRING", "shipment_id"),
)

documents = {
    "CS-POL-014-delayed-order-handling-policy.md": """# Delayed order handling policy (CS-POL-014)

Document ID: CS-POL-014 · Version 3.2 · Status: Approved · Effective 1 September 2026 · Next review 1 March 2027
Owner: Head of Customer Service · Audience: all customer-service staff · Classification: Internal
Fictional sample document for a demonstration. It is not operational guidance.

## 1. Purpose and scope (CS-POL-014)

This policy sets what customer service does when a customer order arrives later than promised: when the
customer is contacted, what may be offered, who approves it and what is recorded. It applies to every customer
order shipped by a carrier.

## 2. Definitions (CS-POL-014)

- A delay is an order whose carrier's expected delivery date is later than the promised date.
- Business days late is the order's DelayBusinessDays value in the live order data, as defined in the Order and
  shipment data definitions (DATA-DEF-002). Analysts never work it out themselves.
- The service tier is the customer's contracted tier in the live customer data: Gold, Silver or Standard.

## 3. Customer contact (CS-POL-014)

Contact the customer about a delay without waiting to be asked:

- Gold customers within one business day of the delay showing in the live order data.
- Silver customers within two business days.
- Standard customers within three business days.

Reply to a customer's own enquiry on the same business day.

## 4. Remedies by service tier (CS-POL-014)

- Gold, 3 or more business days late: offer expedited delivery at no charge once the shipment can move, and a
  service credit of up to 10% of the order value.
- Gold, 1 or 2 business days late: apologise and give the expected delivery date; no remedy.
- Silver, 5 or more business days late: offer expedited delivery at no charge.
- Silver below 5 business days, and Standard: apologise and give the expected delivery date. Any remedy needs a
  team lead's approval.

## 5. Approvals (CS-POL-014)

- An analyst may offer expedited delivery where section 4 allows it, without further approval.
- A service credit always needs a team lead's approval in the customer's service case before it is offered or
  mentioned to the customer. Until then, the analyst may say that further options are being reviewed.
- Anything outside this policy needs the Customer Service manager's approval.
- An AI assistant may prepare a recommendation or a draft. A person checks it, decides and sends it.

## 6. Delivery dates (CS-POL-014)

Give the customer only the carrier's expected delivery date from the live shipment data, and present it as
expected, not guaranteed. If its EtaFreshness is Stale under the Order and shipment data definitions
(DATA-DEF-002 section 5), confirm it with Logistics before giving it.

## 7. Records (CS-POL-014)

Record in the customer's service case the cause of the delay, the date given to the customer, any offer and its
approval.
""",
    "CS-GDL-007-customer-communication-delays.md": """# Customer communication guideline: delayed orders (CS-GDL-007)

Document ID: CS-GDL-007 · Version 2.1 · Status: Approved · Effective 15 June 2026 · Next review 15 December 2026
Owner: Customer Experience lead · Audience: all customer-service staff · Classification: Internal
Fictional sample document for a demonstration. It is not operational guidance.

## 1. Purpose (CS-GDL-007)

How to write to a customer whose order is late, so that every reply is accurate, consistent and kind. The
remedies themselves come from the Delayed order handling policy (CS-POL-014).

## 2. Tone (CS-GDL-007)

Apologise once, plainly, and take ownership. Never blame the carrier, customs, a supplier or a colleague. Use
short sentences and the customer's order number.

## 3. Structure of a delay reply (CS-GDL-007)

1. Apologise and name the order number.
2. Explain the cause in plain terms (section 5).
3. Give the expected delivery date, as expected rather than guaranteed.
4. Say what we will do, including any remedy the policy allows and that is already approved.
5. Say when the customer will hear from us next, and from whom.

## 4. What never goes into a customer reply (CS-GDL-007)

- Names of colleagues other than the sender, and names of third parties such as customs brokers.
- Internal notes, tariff or customs codes, internal system names and case numbers.
- Anything about another customer or another order.
- A service credit or other remedy that has not been approved yet.
- Anything a colleague has asked us not to share.

## 5. Plain wording for common causes (CS-GDL-007)

- Customs documentation check: "held for a routine customs check".
- Carrier capacity or rerouting: "delayed in the carrier's network".
- Weather: "delayed by weather conditions".

## 6. Before sending (CS-GDL-007)

Check every fact against the live order data and every offer against the policy. Copy the customer's account
manager when they have asked to be copied. A person always sends the reply; an AI assistant only drafts it.
""",
    "LOG-KB-031-customs-holds.md": """# Customs holds: internal handling note (LOG-KB-031)

Document ID: LOG-KB-031 · Version 1.4 · Status: Approved · Effective 3 August 2026 · Next review 3 February 2027
Owner: Logistics Operations lead · Audience: logistics and customer-service staff · Classification: Internal
Fictional sample document for a demonstration. It is not operational guidance.

## 1. What a customs hold is (LOG-KB-031)

An import hub holds a shipment until customs accepts its documents or completes a check. Common causes are an
invoice that does not match the packing list, a missing certificate and a random inspection.

## 2. Who acts (LOG-KB-031)

The logistics coordinator owns the hold and works with the customs broker. Customer service does not contact the
carrier or the broker directly: ask the logistics coordinator for updates.

## 3. Typical timeline (LOG-KB-031)

After corrected documents are filed, release usually follows within one to two business days, and delivery from
the import hub within one further business day. This is internal guidance, not a commitment to a customer: the
carrier's expected delivery date in the live shipment data is the date to give.

## 4. Escalation (LOG-KB-031)

Escalate to the Logistics Operations lead when a hold lasts more than three business days, or when the shipment
has had no carrier update for more than one business day.

## 5. Customer wording (LOG-KB-031)

Describe a customs hold to a customer as a routine customs check, as the Customer communication guideline
(CS-GDL-007) sets out. Never share tariff codes, document details or the broker's name.
""",
    "DATA-DEF-002-order-shipment-data-definitions.md": """# Order and shipment data definitions (DATA-DEF-002)

Document ID: DATA-DEF-002 · Version 1.3 · Status: Approved · Effective 1 October 2026 · Next review 1 April 2027
Owner: Data Governance Office · Audience: all staff who use order data · Classification: Internal
Fictional sample document for a demonstration. It is not operational guidance.

## 1. Purpose (DATA-DEF-002)

What the fields of the live order data mean, where they come from, who owns them and what quality to expect.
The live order data is the ScenarioOntology in Fabric, with its Customer, SalesOrder and Shipment entities.

## 2. Customer data (DATA-DEF-002)

Source: the CRM customer master, refreshed nightly. Owner: Sales Operations. Steward: customer master data
steward.

- CustomerId: the stable account ID, never reused.
- CustomerName: the registered trading name.
- ServiceTier: the contracted tier, Gold, Silver or Standard. The Delayed order handling policy (CS-POL-014) sets
  remedies by tier.

## 3. Order data (DATA-DEF-002)

Source: ERP order management, curated hourly with the latest shipment event. Owner: Order Management. Steward:
order data steward.

- OrderId: the sales order number quoted to the customer.
- PromisedDate: the delivery date promised at order confirmation. It never changes afterwards.
- DelayBusinessDays: business days, Monday to Friday, after PromisedDate up to the shipment's CarrierEta; 0 when
  the order is on time or not yet shipped. Public holidays are not deducted. The curated layer calculates it;
  nobody recalculates it by hand.
- OrderStatus: Open without a shipment, Delivered once delivered, Delayed when DelayBusinessDays is above 0,
  otherwise In transit.
- OrderSummary: a short description of the goods that may be quoted to the customer.

## 4. Shipment data (DATA-DEF-002)

Source: carrier events through the transport management system, updated with each event. Owner: Logistics
Operations. Steward: shipment data steward.

- ShipmentStatus: In transit, Customs hold, Delayed or Delivered, with StatusDetail as the carrier's explanation.
- CurrentLocation: the hub, depot or site of the latest carrier event.
- LastUpdate: the date of the latest carrier event.
- CarrierEta: the carrier's expected delivery date, or the delivery date once delivered.
- EtaFreshness: Stale when a shipment that is not delivered has had no carrier event for more than one business
  day, otherwise Current. The curated layer derives it hourly; nobody judges freshness by hand.

## 5. Quality expectations (DATA-DEF-002)

- Freshness: confirm a CarrierEta whose EtaFreshness is Stale with Logistics before giving it to a customer.
- Completeness: every order that is not Open has exactly one shipment.
- Consistency: OrderStatus and DelayBusinessDays follow the rules in section 3.

## 6. Reporting a data issue (DATA-DEF-002)

Report a wrong or stale value to the owning data steward through the data issue queue, with the order or
shipment ID. The steward triages it within two business days and corrects the source system, never the curated
copy. A change to a definition needs the data owner's approval and a change notice to every consumer, including
AI assistants and their evaluations, at least two weeks before it takes effect.

## 7. Change history (DATA-DEF-002)

- 1.3, 1 October 2026: DelayBusinessDays counts business days instead of calendar days, and EtaFreshness is
  added. Change notice sent to all consumers on 15 September 2026.
- 1.2, 1 June 2026: LastUpdate and the freshness expectation added.
""",
}

# METADATA ********************

# META {
# META   "language": "python",
# META   "language_group": "synapse_pyspark"
# META }

# CELL ********************

# The default knowledge_folders entry, documents (target_path documents), indexes Files/documents.
documents_path = f"{lakehouse_path}/Files/documents"


def published_text(path, text):
    """The published file's text, read one byte past the reviewed length so a longer file never matches."""
    return notebookutils.fs.head(path, len(text.encode("utf-8")) + 1)


# Check every published document before writing anything: a governed document is never overwritten.
missing, conflicting = [], []
for name, text in documents.items():
    path = f"{documents_path}/{name}"
    if not notebookutils.fs.exists(path):
        missing.append(name)
    elif published_text(path, text) != text:
        conflicting.append(name)
if conflicting:
    raise ValueError(
        "Files/documents holds a different version of " + ", ".join(conflicting) + ". Nothing was written. "
        "Its owner retires the published copy to a folder no knowledge source indexes, such as Files/archive, "
        "before the reviewed version is published; this notebook never overwrites a document."
    )

# METADATA ********************

# META {
# META   "language": "python",
# META   "language_group": "synapse_pyspark"
# META }

# CELL ********************

def seed_table(name, rows, schema, key):
    source = spark.createDataFrame(rows, schema=schema)
    path = f"{lakehouse_path}/Tables/dbo/{name}"
    if notebookutils.fs.exists(path):
        if not DeltaTable.isDeltaTable(spark, path):
            raise ValueError(f"Refusing to replace a non-Delta path: {path}")
        target = DeltaTable.forPath(spark, path)
        if target.toDF().schema.simpleString() != source.schema.simpleString():
            raise ValueError(f"Existing schema differs from the seed schema: {name}")
        (
            target.alias("target")
            .merge(source.alias("source"), f"target.{key} = source.{key}")
            .whenNotMatchedInsertAll()
            .execute()
        )
    else:
        source.write.format("delta").mode("errorifexists").save(path)
    print(f"{name}: inserted missing demo keys; retained all existing rows.")


for name, rows, schema, key in tables:
    seed_table(name, rows, schema, key)

# METADATA ********************

# META {
# META   "language": "python",
# META   "language_group": "synapse_pyspark"
# META }

# CELL ********************

if missing and not notebookutils.fs.exists(documents_path) and not notebookutils.fs.mkdirs(documents_path):
    raise RuntimeError(f"Could not create the documents folder: {documents_path}")
for name in missing:
    path = f"{documents_path}/{name}"
    if not notebookutils.fs.put(path, documents[name], False):
        raise RuntimeError(f"Could not publish Files/documents/{name}")
    if published_text(path, documents[name]) != documents[name]:
        raise RuntimeError(f"Files/documents/{name} did not read back as the reviewed document.")
    print(f"Published Files/documents/{name}.")
for name in sorted(set(documents) - set(missing)):
    print(f"Files/documents/{name} is already the reviewed version.")

# Every file in the folder is indexed and citable, not only the ones this notebook publishes.
others = sorted(info.name for info in notebookutils.fs.ls(documents_path) if info.name not in documents)
if others:
    print("Files/documents also holds files this notebook did not publish, which the agents can cite: "
          + ", ".join(others) + ". Review them, and retire any that is not approved knowledge.")

print(f"Seed completed in {workspace_name}; lakehouse GUID: {lakehouse_id}")
print("SQL endpoint discovery, graph loading and semantic-model refresh are separate.")

# METADATA ********************

# META {
# META   "language": "python",
# META   "language_group": "synapse_pyspark"
# META }
