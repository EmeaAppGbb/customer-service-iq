# Order and shipment data definitions (DATA-DEF-002)

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
