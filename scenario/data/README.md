# Delayed-order scenario data

> [!IMPORTANT]
> **Fictional sample.** The company, customers, orders, carrier and mail are invented to demonstrate
> Microsoft IQ. Never replace them with real customer data.

A customer-service analyst investigates a delayed customer order and prepares a reply. The scenario is set on
**Thursday 19 November 2026**. Its live business data is three small tables in the DEV `Scenario` lakehouse,
mapped to the `Customer`, `SalesOrder` and `Shipment` entities of `ScenarioOntology` and queried through Fabric IQ as
the signed-in user.

| File | What it holds |
| --- | --- |
| [`contract.json`](contract.json) | The versioned data contract: each table's grain, key, columns, types, nullability, allowed values, source system, owner, steward and refresh; the ontology entities, their property-to-column mappings and relationships; and the quality rules |
| [`fixtures/`](fixtures/) | The reviewed fictional rows, one CSV per table. `SeedScenario` embeds exactly these rows; [`scenario/evals`](../evals/) checks that they match |
| [`work-context-mail.md`](work-context-mail.md) | The two fictional messages the presenter puts into their own mailbox for Work IQ |

The governed calculations, `delay_business_days`, `order_status` and `eta_freshness`, live in
[`scenario/workflows/delay_rules.py`](../workflows/delay_rules.py). The curated data owns them: an agent reads
`DelayBusinessDays` and `EtaFreshness` from the ontology and never works out a delay or judges a date's
freshness itself.

## The model

```text
Customer (CustomerId, CustomerName, ServiceTier)
   ^ PlacedBy: many sales orders to one customer
SalesOrder (OrderId, OrderCustomerId, OrderDate, PromisedDate, OrderStatus, DelayBusinessDays, OrderSummary)
   ^ Delivers: many shipments to one sales order (one per shipped order in this sample)
Shipment (ShipmentId, ShipmentOrderId, Carrier, ShipmentStatus, StatusDetail, CurrentLocation, LastUpdate, CarrierEta,
          EtaFreshness)
```

The order entity is `SalesOrder`, not `Order`, which query languages reserve.

| Table | Rows | Owner | Steward | Source | Refresh |
| --- | --- | --- | --- | --- | --- |
| `dbo.demo_customers` | 4 | Sales Operations | Customer master data steward | CRM customer master | Nightly |
| `dbo.demo_orders` | 5 | Order Management | Order data steward | ERP order management, curated with the latest shipment event | Hourly |
| `dbo.demo_shipments` | 4 | Logistics Operations | Shipment data steward | Carrier events through the transport management system | With each carrier event |

Dates are `DATE`, `delay_business_days` is `INT`, every other column is `STRING`, and no column is null.

## The story in the data

| Order | Customer (tier) | Promised | Status | Business days late | Shipment |
| --- | --- | --- | --- | --- | --- |
| SO-48213 | Fabrikam Retail (Gold) | 13 November 2026 | Delayed | 5 | SHP-7781, Customs hold at the Eastport import hub, expected 20 November 2026 (Current), updated 18 November 2026 |
| SO-48214 | Tailspin Toys (Standard) | 20 November 2026 | In transit | 0 | SHP-7782, on schedule, expected 20 November 2026 |
| SO-48215 | Adventure Works Cycles (Silver) | 10 November 2026 | Delivered | 0 | SHP-7779, delivered 10 November 2026 |
| SO-48216 | Fabrikam Retail (Gold) | 27 November 2026 | Open | 0 | None yet |
| SO-48217 | Wide World Importers (Gold) | 17 November 2026 | Delayed | 2 | SHP-7784, rerouted at the Northgate depot, expected 19 November 2026 (**Stale**), last updated 16 November 2026 |

- **SO-48213** is the demo's main case: a Gold customer, five business days late, so the policy's remedies and
  approvals apply, and the analyst's mail explains the hold and the customer's deadline.
- **SO-48217** is the contrast: Gold but only two business days late, so no remedy, and the curated data flags
  its expected date as stale, so a person confirms it with Logistics before giving it to the customer.

## Change the data

Change `contract.json`, the fixtures, the workflow rule and `SeedScenario` together, then run the scenario
checks: `python3 -B -m unittest discover -s scenario/evals`. Seeding is insert-only: an existing key is never
updated in a deployed lakehouse, so a changed row reaches DEV only after a person deletes the old row there.
