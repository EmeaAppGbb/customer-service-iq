# Delayed order handling policy (CS-POL-014)

Document ID: CS-POL-014 | Version 3.2 | Status: Approved | Effective 1 September 2026 | Next review 1 March 2027
Owner: Head of Customer Service | Audience: all customer-service staff | Classification: Internal
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
