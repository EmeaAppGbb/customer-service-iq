# Decision record: maturity, open questions, evidence and owners

> [!IMPORTANT]
> A starting record for the session, written for the fictional delayed-order scenario. Owners are proposed
> roles, not people: confirm them, and the product status, before a pilot.

This page records what the session should leave with: the maturity of each capability used, the questions still
open, the evidence that would close them, and who follows up. It ends with the evidence path from this demo to a
pilot and to scale.

## Maturity record

As checked on 19 November 2026; see the [architecture's maturity table](architecture.md#maturity) for sources.

| Capability used | Status | Shown in the demo | Risk if relied on today |
| --- | --- | --- | --- |
| Foundry prompt agents, tracing, evaluations | GA | Yes | Low |
| Fabric IQ ontology and the Foundry Fabric IQ tool | Preview | Yes | Preview terms; tool names and behavior can change |
| Fabric deployment plans | Preview | Yes, for bootstrap | A fallback path exists in the runner |
| Foundry IQ agentic retrieval over OneLake documents | GA; the agent's MCP connection is in preview | Yes | Low to medium |
| Web IQ search | GA; no SLA; outside the DPA and EU Data Boundary | Yes | Data-handling review needed |
| Web IQ as a Search MCP source | Preview | Yes | Preview terms |
| Work IQ MCP server and APIs | GA; several features in preview | When enabled | Credits must be budgeted per user |
| Agent 365 | GA | Discussed | Licensing per user who manages, sponsors or uses agents |
| Copilot Studio with connected Foundry agents | GA product; connected agents partly in preview | Discussed | Validate the end user's identity reaching Foundry tools |
| Azure AI Landing Zones reference | Preview | Discussed | Use as a checklist |

## Open questions

| # | Question | Evidence that would answer it | Proposed owner | Follow-up |
| --- | --- | --- | --- | --- |
| 1 | Which business owner sponsors the pilot, and which measures define success? | A signed pilot charter with a baseline | Head of Customer Service | Agree measures and a baseline period |
| 2 | Which orders, customers and documents are in scope, and is every document fit for every agent user? | A scoped corpus list with owners and review dates | Service owner with knowledge owners | Inventory and approve the corpus |
| 3 | Do Fabric IQ and OneLake security return only the rows each analyst may read? | A second-user test, case `CS-AUTH-11` | Data owners with the platform team | Configure roles; run the case with two users |
| 4 | Can Work IQ be enabled for the pilot users, and within what Copilot Credits budget? | Tenant enablement, a spending policy and a measured cost per answer | Microsoft 365 administrator and finance | Enable for a pilot group; meter for two weeks |
| 5 | Is Web IQ acceptable under the organization's data-handling policy, given it is outside the DPA and EU Data Boundary? | A data-protection assessment of public-only queries | Privacy officer | Assess; or run the pilot without Web IQ |
| 6 | Which channel do analysts use: this web app, Teams, or Microsoft 365 Copilot? | Analyst feedback and a channel test | Product owner | Publish the agent to Teams for a test group |
| 7 | Should the agent be built and owned in Foundry or Copilot Studio long term? | The [capability selection](capability-selection.md) applied to the team's skills and the roadmap | Enterprise architect | Decide at the pilot gate |
| 8 | How are the agents registered, owned and retired in Agent 365? | The agents visible in the registry with owners and sponsors | AI governance board | Enable the Foundry integration; assign owners |
| 9 | Which approval workflow handles service credits? | A Power Automate or agent-flow approval with an audit trail | Process owner, customer service | Build the approval outside the agent |
| 10 | How does the solution fit the existing Azure AI Landing Zone's networking? | A design review against the [constraints](architecture.md#maturity) | Platform architect | Review private endpoints and the AI gateway |
| 11 | Who runs the service, and what support do Microsoft and a partner provide? | An agreed [operating model](governance-and-operations.md#service-operating-model) and runbook | IT service owner | Agree the responsibility matrix |
| 12 | How are answer quality and drift monitored after go-live? | Scheduled runs of the [evaluation cases](../../scenario/evals/README.md) with thresholds | Service owner | Set thresholds; schedule the runs |

## From demo to pilot to scale

| Stage | Business ownership | Evidence required | Readiness | Decisions before the next stage |
| --- | --- | --- | --- | --- |
| **Demo** (this repository) | Sponsor identified | The live demo: every evaluation case passes for one user | DEV only; fictional data | Proceed to a pilot? Which scope? |
| **Pilot** (one team, real but limited data, 6 to 8 weeks) | Named product owner and service owner | Baseline and pilot measures: handling time per delayed-order enquiry, share of replies sent on the policy's deadline, offers compliant with the policy, rework after review, analyst satisfaction; cost per answer; the authorization cases with real users | Security, privacy and Responsible AI reviews; the access model; data owners and stewards for the in-scope tables; Work IQ and Web IQ decisions; a support route | Did measures beat the baseline at an acceptable cost? Is the operating model staffed? |
| **Limited production** | Business owner accountable for outcomes | Stable evaluation results over releases; incident and change records; cost within budget | Production identities and networking in the landing zone; promotion through TEST; monitoring and alerting | Which further teams and data domains? |
| **Scale** | Portfolio governance through the AI governance board | Value per team; reuse of the ontology, knowledge and evaluation patterns | Agent 365 registry and policies for every agent; capacity and credit planning | Standardize as a platform service |

### Costs to estimate before a pilot

- **Fixed:** Fabric capacity, the Search service tier, Container Apps' minimum replicas, Application Insights.
- **Per use:** model tokens per answer, agentic-retrieval tokens, Work IQ calls in Copilot Credits, Web IQ calls.
- **Per user:** Microsoft 365 Copilot and Agent 365 licences, where the chosen channel and governance need them.
- **People:** the service owner, the stewards' and knowledge owners' time, and evaluation runs.

Measure the per-use costs from the pilot's own telemetry rather than estimating them from list prices.
