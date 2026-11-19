# Reviewed knowledge for the delayed-order scenario

> [!IMPORTANT]
> **Fictional sample.** The company, customers, carrier, documents and mail in this scenario are invented to
> demonstrate Microsoft IQ. They are not operational guidance.

These are the only documents the agents' Foundry IQ knowledge base may cite. `SeedScenario` carries their exact
bytes and publishes them, insert-only, into the knowledge lakehouse's `Files/documents` folder, which the default
`documents` [knowledge folder](../../docs/ontology-knowledge.md#register-the-folders-and-the-ontology) indexes, and
reads each one back. A published file with different content stops the run rather than being overwritten. To
publish a new version, its owner first retires the published copy to a folder no knowledge source indexes, such
as `Files/archive`; then the reviewed `SeedScenario` publishes the new bytes.

| File | ID | Version | Effective | Owner | What it governs |
| --- | --- | --- | --- | --- | --- |
| [`CS-POL-014-delayed-order-handling-policy.md`](CS-POL-014-delayed-order-handling-policy.md) | CS-POL-014 | 3.2 | 1 September 2026 | Head of Customer Service | Contact deadlines, remedies by service tier, approvals, delivery dates, records |
| [`CS-GDL-007-customer-communication-delays.md`](CS-GDL-007-customer-communication-delays.md) | CS-GDL-007 | 2.1 | 15 June 2026 | Customer Experience lead | Tone, structure and wording of a delay reply; what never goes into one |
| [`LOG-KB-031-customs-holds.md`](LOG-KB-031-customs-holds.md) | LOG-KB-031 | 1.4 | 3 August 2026 | Logistics Operations lead | What a customs hold is, who acts, typical timeline, escalation |
| [`DATA-DEF-002-order-shipment-data-definitions.md`](DATA-DEF-002-order-shipment-data-definitions.md) | DATA-DEF-002 | 1.3 | 1 October 2026 | Data Governance Office | Meaning, source, owner, steward and quality of each field in the live order data |

## Authority

| Source | Authority | Reached through |
| --- | --- | --- |
| Live order data (`ScenarioOntology`) | The only source of current facts: tiers, orders, statuses, delays, shipment status and expected dates | Fabric IQ, as the signed-in user |
| These documents | Policy and guidance: what we may offer, who approves it, how we write, what a field means. Never proof of current status | Foundry IQ, as the Foundry project |
| The analyst's own mail | What colleagues reported or planned, such as the cause of a hold or a customer's deadline. Never current status | Work IQ, as the signed-in user |
| Public web context | General background only, labelled "Public context, not company guidance". Never overrides a document or the live data | Web IQ, as the Foundry project, with public terms only |

Every document has an ID, a version, an owner, an effective date and a review date, and every section heading
repeats the document ID, so a retrieved passage can always be attributed. Keep golden answers, evaluation cases
and mail out of this folder: they live in [`scenario/evals/`](../evals/) and
[`scenario/data/work-context-mail.md`](../data/work-context-mail.md), and are never indexed.
