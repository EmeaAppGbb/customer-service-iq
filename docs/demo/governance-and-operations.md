# Governance, service operation and quality

> [!IMPORTANT]
> **Fictional sample.** Roles below are examples for the delayed-order scenario. Map them to your organization's
> own owners before a pilot.

This page answers the enterprise architect's and the IT service owner's questions for the
[delayed-order scenario](architecture.md): how an AI capability is registered, owned, accessed, reviewed, changed
and retired; what it costs and how that is controlled; who operates it; how meaning and quality stay reliable;
and how people grow from using it to governing it.

## The lifecycle of an AI capability

Extend the governance you already have rather than building a parallel regime: every agent, tool and knowledge
source gets an accountable owner and a risk class, and centralized visibility doesn't mean central approval of
every change ([CAF: govern agents](https://learn.microsoft.com/azure/cloud-adoption-framework/ai-agents/architecture-governance)).
The scenario's assistant drafts and recommends but never changes a system of record, so it sits on the "assist"
side of the assist-to-execute line; a version that sends replies or grants credits would need a higher risk tier.

| Stage | What happens | In this scenario | Platform mechanism |
| --- | --- | --- | --- |
| **Register** | The capability is inventoried with its purpose, data, tools and risk class | The two agents are reviewed definitions in [`agents/`](../../agents/README.md); the runner publishes them with a digest of exactly what was reviewed | Foundry project; Agent 365 registry, which syncs Foundry and Copilot Studio agents; Entra Agent ID |
| **Assign an owner** | A business owner, a technical owner and a sponsor are named | Product owner: Head of Customer Service. Service owner: the knowledge-retrieval service owner. Data owners per table in the [contract](../../scenario/data/contract.json) | Agent 365 owners; Entra sponsors |
| **Grant access** | Users, data and tools are granted least privilege, per user | A Foundry role per user; read access to the DEV ontology per user; Work IQ consent per user; documents fit for every user | Azure RBAC, Fabric workspace roles and OneLake security, Work IQ consent and policy, Entra access packages with expiry |
| **Review** | Changes pass security, privacy, Responsible AI and evaluation gates sized to the risk | Pull request review, CI checks, the [evaluation cases](../../scenario/evals/README.md), and the runner's approvals of each plan and publication by hash | CI; Foundry evaluations and red teaming; Purview DSPM for AI |
| **Change** | A versioned change is reviewed, evaluated, published and announced | An instruction, tool, document or data change is a commit; the runner publishes a new agent version only for a changed digest | Agent versions; deployment plans; document versions and change notices |
| **Retire** | Execution stops, access is revoked, records follow retention, and the owner confirms | The runner's reviewed teardown, or deleting the agents and revoking roles; documents move to an unindexed archive | Agent 365 block and delete; Entra inactivity policy; retention policies |

## Governance and cost in the scenario

### Ownership

| What | Owner | Steward or operator |
| --- | --- | --- |
| The assistant's purpose, instructions and acceptance | Head of Customer Service (product owner) | Knowledge-retrieval service owner |
| Customer data | Sales Operations | Customer master data steward |
| Order data, the delay and status rules | Order Management | Order data steward |
| Shipment data and its freshness | Logistics Operations | Shipment data steward |
| Each document | Its named owner, such as the Head of Customer Service for CS-POL-014 | The service knowledge manager, who publishes reviewed versions |
| The platform: Fabric, Search, Foundry, the app | The platform team | The cloud operations team |
| Approvals and the reply | The analyst and the team lead | Nobody delegates them to the agent |

### Data boundaries

- Live business data stays in OneLake; Fabric IQ queries it in the workspace's region.
- Documents are indexed into the Search service's region. Keep the Search and Fabric regions aligned, or review
  the cross-region flow.
- Mail stays in Microsoft 365; Work IQ honors permissions and sensitivity labels.
- Web IQ is global, outside the Data Protection Addendum and the EU Data Boundary, with no Private Link. Only
  public terms go there, and its answers are labelled "Public context, not company guidance".
- Prompts, answers and tool results reach Application Insights' protected content table only.

### Auditability

| Question | Evidence |
| --- | --- |
| Which sources supported this answer? | The source markers and *Sources* lines in the answer; the tool timeline in the app |
| Who asked, and what did the agent do? | Foundry's trace of the run, with the user's object ID, each tool call and the model calls, joined to the app's request by one trace ID |
| What exactly was deployed? | The agent version's `definition_sha256`, the reviewed commit and the runner's approval receipts |
| Who read which mail or data? | Microsoft 365 and Purview audit for Work IQ; Fabric audit logs for the ontology |
| Did the app see the content? | No: its logs and spans are value-free by design |

### Consumption controls

| Cost driver | Meter | Control |
| --- | --- | --- |
| Fabric capacity | Capacity units, including the ontology's meters | Right-size the SKU; pause between sessions; capacity metrics |
| Foundry models | Tokens on the `agent`, `chat` and `embedding` deployments | Per-deployment quota; low reasoning effort; short answers |
| Foundry IQ | Search service tier, plus agentic-retrieval tokens after the free allowance | Minimal retrieval effort for documents; one folder per approved corpus |
| Work IQ | Copilot Credits per call, under a spending policy, even for Microsoft 365 Copilot users | Spending policy and per-agent caps; one `fetch` per question |
| Web IQ | Pay-as-you-go per 1,000 calls | One call per question, only when public context is asked for; Web IQ's own quota |
| The app | Container Apps compute, the registry, log ingestion | `min_replicas = 0` between sessions; retention days |

Set Azure budgets with alerts on the resource group, and review cost by service monthly against the pilot's
value measures.

### Monitoring, support and change

- **Monitoring:** Application Insights for every turn (outcome, tool failures, consent requests, latency); the
  Fabric capacity metrics app; Search ingestion status per knowledge source; Work IQ and Copilot Credits usage in
  the Microsoft 365 admin center.
- **Support:** the service desk takes the analyst's report with the response ID the app shows; the service owner
  triages; data issues go to the owning steward, document issues to the knowledge owner, platform issues to the
  platform team, and product defects to Microsoft support.
- **Change:** every change is a commit with CI checks; the runner shows each plan and publication and acts only on
  approval; evaluation cases are rerun before publishing; data definition changes are announced to consumers,
  including the agent's evaluations, before they take effect.

## Service operating model

| Activity | Organization | Microsoft | Partner (optional) |
| --- | --- | --- | --- |
| Service ownership, scope and acceptance | **Accountable**: service owner | | Advises |
| Data and knowledge ownership and quality | **Accountable**: data and knowledge owners; stewards operate | | Builds pipelines |
| Agent instructions, tools and evaluations | **Accountable**: service owner; product team operates | Provides evaluators and tracing | Builds and tunes |
| Platform operation: capacity, quota, identities, networking | **Accountable**: platform team | Runs the services within their SLAs, where an SLA exists | Can run under contract |
| Incident response | Service desk and service owner lead; stewards and platform team resolve | Product support for service faults | Can be first or second line |
| Change and release | Change advisory, with the runner's approvals | Product changes and retirements, announced in advance | Implements |
| Security, privacy and Responsible AI review | Security, privacy and the AI governance board | Transparency notes and product controls | Assesses |
| Handover from build to run | Service owner accepts the runbook, evaluation baseline and cost model | | Hands over |

Preview features carry no SLA, and Web IQ has none: the service owner records that risk before a pilot.

## How meaning and ownership stay reliable as data changes

- **One contract.** [`contract.json`](../../scenario/data/contract.json) versions every table's grain, key,
  types, allowed values, source, owner, steward and refresh, the ontology entities and relationships, and the
  quality rules.
- **Meaning travels with the data.** Every ontology entity and property carries its description, and stable
  lineage tags keep its identity across renames. The [data definitions](../../scenario/knowledge/DATA-DEF-002-order-shipment-data-definitions.md)
  explain each field in business terms, with a change history.
- **Rules live in data, not prompts.** The delay, the order status and the freshness flag are computed by
  [governed rules](../../scenario/workflows/delay_rules.py) in the curated layer. The agent reads them; it never
  recalculates them.
- **Drift is caught before release.** The [scenario checks](../../scenario/evals/README.md) compare the contract,
  fixtures, rules, ontology, seeder, documents and evaluation cases on every pull request.
- **Consumers are told.** A definition change needs the data owner's approval and a notice to every consumer,
  including AI assistants and their evaluations, two weeks ahead (DATA-DEF-002 section 6). Version 1.3 of the
  definitions, which moved the delay from calendar to business days, is the worked example.
- **Lineage shows the blast radius.** Fabric's lineage and impact analysis show which items consume a table
  before it changes.

## How data owners and stewards resolve a governance issue

The demo surfaces one issue in the data itself: shipment SHP-7784 for order SO-48217 has had no carrier event
since 16 November 2026, so the curated data flags its expected date as **Stale**.

1. **Surfaced.** The analyst asks which orders are delayed; the answer shows the stale flag from the data, not
   the agent's judgement. Asked whether the date may be given to the customer, the agent cites the policy: not
   until Logistics confirms it (evaluation case `CS-DQ-09`).
2. **Reported.** The analyst raises a data issue with the order and shipment IDs, as DATA-DEF-002 section 6 sets
   out.
3. **Triaged.** The shipment data steward confirms within two business days whether the carrier feed is late or
   the shipment is lost, and corrects the source system, never the curated copy.
4. **Decided.** If the rule itself is wrong, for example a stale threshold too tight for weekend deliveries, the
   data owner decides the change; the steward updates the contract, rule, fixtures and definitions together.
5. **Announced and checked.** A change notice goes to consumers; the evaluation cases run again before the new
   definition takes effect.

People decide at steps 1, 3 and 4; the agent only makes the issue visible. A second built-in check covers
knowledge: `SeedScenario` refuses to overwrite a published document that differs from the reviewed version, so a
document owner must retire the old copy deliberately before a new version goes live.

## Quality and fitness over time

| What | How it is assessed | Signal of decline |
| --- | --- | --- |
| Answers | The [evaluation cases](../../scenario/evals/cases.json) run live before each release and on a schedule, with the expected tools, facts, citations, draft exclusions and refusals | A case fails; citations disappear; tools are skipped or called needlessly |
| Retrieval | Search ingestion status; the runner's `verify` evidence of cited document and live-ontology retrieval | Ingestion errors; "no approved document covers it" where one should |
| Data | Contract checks in CI; the freshness flag; stewards' issue queue | A rising share of stale shipments; repeated issues on one field |
| Documents | Review dates on every document; insert-only publication | A document past its review date; conflicting versions |
| Outcomes | Pilot measures: handling time per enquiry, policy compliance of offers, rework after review | Analysts edit drafts heavily or stop using them |
| Operation | Tool failures, consent requests, latency and cost per turn in Application Insights | Rising timeouts, consent loops or cost per answer |

Foundry's evaluations can score the same cases automatically against traced runs, with evaluators for tool
calls, groundedness and task adherence; adopt them as a reviewed change once the manual baseline is stable.

## Workforce roles

| Stage | Role | Builds or decides | Needs |
| --- | --- | --- | --- |
| Use | Customer-service analyst | Asks, reviews, decides, sends | Training on reading citations and on the agent's limits |
| Curate | Knowledge owner, data steward | Approves documents and definitions; resolves data issues | Clear ownership, review dates, an issue queue |
| Build | Maker in Copilot Studio, or pro developer in Foundry | Agents, tools, evaluations | A managed environment, templates like this one, review |
| Govern | Service owner, AI governance board | Risk class, access, releases, retirement | The registry, telemetry and evaluation results |

A locally built assistant needs stronger ownership and a managed service once it is customer-facing, takes
actions, crosses teams or uses regulated data, or once others depend on it. At that point it needs a named
owner, a support route, evaluations, a cost owner and a place in the agent registry.
