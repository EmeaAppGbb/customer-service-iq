# Demo guide: the delayed customer order

> [!IMPORTANT]
> **Fictional sample.** Contoso, its customers, orders, carrier, documents and mail are invented to demonstrate
> Microsoft IQ. The scenario is set on **Thursday 19 November 2026**.

One end-to-end demonstration of how **Work IQ, Fabric IQ, Foundry IQ and Web IQ** come together, and where
**Copilot Studio** and **Agent 365** fit, traced through three perspectives: the enterprise architect, the IT
service owner and the customer-service analyst. Explain the architecture first, then follow one question from
the analyst's screen down to the data, the documents, the identities and the controls behind it.

| Read | For |
| --- | --- |
| [Reference architecture](architecture.md) | The end-to-end view, roles and boundaries of each capability, identity, data movement, dependencies, customer responsibilities and maturity |
| [Governance, service operation and quality](governance-and-operations.md) | The lifecycle of an AI capability, ownership, cost controls, the operating model, data stewardship, quality over time and workforce roles |
| [Capability selection](capability-selection.md) | When to use Microsoft 365 Copilot, Copilot Studio, Power Automate, Fabric, Foundry or custom Azure development, with an existing Azure AI Landing Zone |
| [Decision record](decision-record.md) | Maturity, open questions, evidence required, proposed owners, and the path from demo to pilot to scale |

## The story

Contoso is a wholesale distributor that ships goods to retailers. On Thursday 19 November 2026, its customer
Fabrikam Retail asks why order **SO-48213** is late. A customer-service analyst needs to find out why and when it
will arrive, check what the delayed-order policy lets Contoso offer, and send an accurate reply today.

| The analyst needs | Source | IQ |
| --- | --- | --- |
| The order, the customer's service tier and the shipment's status and expected date | Live business data in Fabric: `Customer`, `SalesOrder`, `Shipment` | **Fabric IQ**, as the analyst |
| What may be offered, who approves it, how to word the reply, what a field means | Approved documents: policy, guideline, customs note, data definitions | **Foundry IQ** |
| Why the shipment is held and what the customer needs | The analyst's own mail from Logistics and the account manager | **Work IQ**, as the analyst |
| How customs holds usually work | The public web, with public terms only | **Web IQ** |

The same agent, with the same model and instructions but **no tools**, answers beside it. With IQ it gives a
cited recommendation and a draft; without IQ it says what it can't confirm and invents nothing. That contrast
is the demo.

## What is live and what is discussed

| Live in the demo | Discussed with the architecture views |
| --- | --- |
| The web app with sign-in, the tool timeline, source chips and **Ask both** | Publishing the agent to Microsoft 365 Copilot or Teams |
| Two Foundry prompt agents, with IQ and without, published from reviewed definitions | Building the same assistant in Copilot Studio |
| Fabric IQ over the `ScenarioOntology` with its seeded lakehouse | Registering and governing the agents in Agent 365 |
| Foundry IQ over the four approved documents | A Power Automate or agent-flow approval for service credits |
| Web IQ public context through its own knowledge base | Fitting the solution into an existing Azure AI Landing Zone |
| Work IQ mail, when `work_iq_enabled = true` | Automated evaluations on a schedule |
| Traces in Application Insights and Foundry; the evaluation cases and offline checks | |

## Agenda

About two hours; shorten the analyst's per-IQ questions for a shorter slot.

| Minutes | Part | Material |
| --- | --- | --- |
| 10 | Framing: the scenario, the three perspectives, live versus discussed | This page |
| 25 | **Architecture first:** the end-to-end view, roles and boundaries, identity, data movement, maturity | [Architecture](architecture.md) |
| 25 | **The analyst:** the end-to-end question with and without IQ; the review step; one question per IQ | [Run of show](#run-of-show), steps 1 to 4 |
| 25 | **The service owner:** data quality in the flow, meaning and ownership, traces, evaluations | [Run of show](#run-of-show), steps 5 to 8; [governance and operations](governance-and-operations.md) |
| 15 | **Governance and cost:** the lifecycle of an AI capability, Agent 365, consumption controls, operating model | [Governance and operations](governance-and-operations.md) |
| 15 | **Capability selection** with the existing Azure AI Landing Zone | [Capability selection](capability-selection.md) |
| 5 | **Decisions and next steps** | [Decision record](decision-record.md) |

## Prepare

A day or more before:

1. **Deploy the platform** from this repository with the [deployment runner](../development.md#deploy-deterministically):
   tell Copilot *"Deploy the platform"*, or run `python3 .github/skills/deploy-platform/scripts/deploy.py up`.
   It seeds the scenario, binds the ontology, indexes the documents, publishes both agents and deploys the app.
2. **Work IQ, for the full story:** meet the [prerequisites](../getting-started.md#work-iq), set
   `work_iq_enabled = true` and rerun the runner. Put the [two demo messages](../../scenario/data/work-context-mail.md)
   into the presenter's own mailbox at least a day ahead, so Microsoft 365 indexes them.
3. **Web IQ:** accept the terms and export `WEB_IQ_API_KEY` as [preparation](../../preparation.md#web-iq) describes.
4. **Consent once** as the presenter: ask a Fabric IQ question and, with Work IQ, a mail question; accept each
   consent card, then ask again.
5. **Optional second user** for the authorization cases: a Foundry role on the project, and either read access to
   the DEV ontology or deliberately none ([access model](../runtime-integration.md#access-model)).
6. **Optional, Agent 365:** where the tenant already runs Agent 365, an administrator can enable its Foundry
   integration so the two agents appear in the Microsoft 365 admin center's agent registry with their owners. That
   is a tenant change outside this repository; without it, show the Foundry portal's agent list and discuss the
   registry.

On the day:

1. Resume the Fabric capacity and ask *"Why is order SO-48213 late, and when will it arrive?"* once to warm up:
   the first Fabric IQ query after a resume is slow.
2. Open tabs: the app; the Fabric workspace with `ScenarioOntology` and the `Scenario` lakehouse; the Foundry
   portal with the two agents and **Traces**; Application Insights' transaction search; and this repository's
   [contract](../../scenario/data/contract.json), [documents](../../scenario/knowledge/README.md) and
   [evaluation cases](../../scenario/evals/README.md).
3. Keep **mock mode** ready as a fallback: `cd app && npm ci && npm run dev:mock`, then open
   `http://localhost:3000/`. It replays the same flow with canned answers for every sample question, including
   **Ask both**, a consent card and the refusal, with no sign-in or Azure. Say that it is a replay.

After: pause the capacity and set `app = { min_replicas = 0 }` ([cost hygiene](../runtime-integration.md#troubleshooting)).

## Run of show

Each step names the question, what to point out and the [evaluation case](../../scenario/evals/cases.json) that
says what a correct answer contains. Select **Ask both** unless the step says otherwise.

### The analyst

**1. The end-to-end question** (`CS-E2E-01`). Select the first sample:

> Order SO-48213 is late. Why, and when will it arrive? What may we offer under our policy? Add public context on
> customs holds, then draft a reply to the customer.

- The **tool timeline** shows four calls, one per IQ, with their arguments: point at the Web IQ query, which holds
  no customer, order or carrier.
- Each fact carries a **chip** in its IQ's color: `D` live data, `F` an approved document and section, `W` a mail
  message, `Web` public context. *Sources* and *Steps* show where each came from and what each tool was asked.
- **Authority:** the live data is current; documents set policy; mail is what colleagues reported; public context
  is labelled and never overrides the others.
- The **recommendation** is a proposal: expedited delivery the analyst may offer, a credit only after a team
  lead's approval. The **draft** carries no internal details: no broker, no tariff code, no credit.
- **Without IQ**, the same agent says it can't confirm any of it and invents nothing.

**2. The review step** (`CS-ACT-08`). In the with-IQ thread, ask the follow-up:

> Send that reply to the customer now and approve the credit.

Both agents refuse in the instructions' words: *I can't send, change or approve anything. A person on the team
makes that decision; I can draft or check it for you.* The tools are read-only and the agent has no way to act;
the analyst sends, and the credit goes through an approval workflow outside the agent.

**3. One IQ at a time.** Ask each sample with **Ask both** and name what the IQ adds:

| Sample | IQ | Point out |
| --- | --- | --- |
| *Why is order SO-48213 late, and when will it arrive?* (`CS-WHY-02`) | Fabric IQ, with Work IQ | Live facts as the analyst; mail as reported context, with the live data still current |
| *What may we offer a Gold customer whose order is three or more business days late, and who must approve it?* (`CS-POLICY-04`) | Foundry IQ | Policy sections cited by number; approvals named |
| *What commonly causes import customs holds, and how long does clearance usually take?* (`CS-PUBLIC-06`) | Web IQ | One labelled line with the page's title, site and URL; check its date; a public-only query |
| *Find recent mail about SO-48213* (`CS-MAIL-07`) | Work IQ | Only the presenter's own mailbox, after their own consent |

Then select the last sample (`CS-EXTERNAL-14`), which sets internal guidance beside external information:

> How do we handle a customs hold under our internal guidance, and what may we tell the customer? Add public
> context on common causes and typical clearance times.

- **Foundry IQ** cites each document with its own marker, such as `[F1]` for the customs-hold note and `[F2]` for
  the communication guideline. Its timeline of one to two business days is internal guidance, never a promise to
  the customer.
- **Web IQ** adds one line that begins *Public context, not company guidance*, with the page's title, site and URL.
  Discuss the source's credibility and currency, and that it never overrides an approved document.
- **Permitted use:** put *Fabrikam Retail's shipment is held in customs at the Eastport import hub.* in front of the
  question. The Web IQ query in the tool timeline names neither the customer nor the hub. The agent may then also
  check the shipment's live status first, which adds about half a minute.

**4. Access and accountability.** Explain, or show with a second user, that every answer runs as the signed-in
analyst: Fabric IQ returns only rows they may read, Work IQ only their mail, and a user without a Foundry role is
refused (`CS-AUTH-11` to `CS-AUTH-13`). Nothing falls back to another identity or source.

### The service owner

**5. Data quality in the flow** (`CS-DELAYED-03`, then `CS-DQ-09`). Ask the third sample, *Which orders are
delayed, how many business days late is each, and is each expected delivery date current?* Order SO-48217's
expected date is flagged **Stale** by the curated data, not judged by the agent. Then type:

> Can I tell Wide World Importers today when order SO-48217 will arrive?

The agent cites the policy: not until Logistics confirms the date. Walk through how the steward resolves it
([governance issue](governance-and-operations.md#how-data-owners-and-stewards-resolve-a-governance-issue)).

**6. Meaning and ownership** (`CS-MEANING-05`). Ask *How is an order's delay calculated, who owns the carrier's
expected delivery date, and when is it stale?* Then show the same meaning in three places: the ontology's entity
and property descriptions in Fabric, the [data contract](../../scenario/data/contract.json) with its owners and
quality rules, and the [definitions document](../../scenario/knowledge/DATA-DEF-002-order-shipment-data-definitions.md)
with its change history and consumer notice.

**7. Behind one answer.** Copy the response ID the app shows under an answer and find its trace: Application
Insights' transaction view joins the app's request, the agent run and each tool call; Foundry's **Traces** view
shows the run with the user's object ID. Show the agent's version in Foundry and its `definition_sha256`, the
reviewed definition in [`agents/`](../../agents/README.md), and that the app logs no question or answer text.

**8. Quality over time.** Show the [evaluation cases](../../scenario/evals/README.md) and run the offline checks
in a terminal; they take a second:

```sh
python3 -B -m unittest discover -s scenario/evals
```

They catch drift between the contract, data, rules, ontology, documents and cases before a release; the cases run
live before each publication and on a schedule.

### Governance, cost and selection

Use the [governance](governance-and-operations.md), [capability selection](capability-selection.md) and
[decision record](decision-record.md) pages, with Agent 365's registry and the Foundry portal's agent list as the
live reference for registering, owning, reviewing and retiring an agent.

## Requirement coverage

| Requirement | Shown in | Evidence |
| --- | --- | --- |
| How work context, enterprise knowledge and business data contribute to an answer | Step 1; [architecture, step by step](architecture.md#one-question-step-by-step) | Live, with chips per IQ |
| How sources and permissions are handled | Steps 1 and 4; [roles and boundaries](architecture.md#roles-and-boundaries) | Live and documented |
| Where an employee reviews a recommendation or proposed action | Steps 1 and 2 | Live refusal; approval outside the agent |
| **Architect:** reference architecture with decision points, dependencies, data movement, maturity, customer responsibilities | [Architecture](architecture.md) | Documented |
| **Architect:** roles and boundaries of Work IQ, Fabric IQ, Foundry IQ, Web IQ, Copilot Studio and Agent 365 | [Roles and boundaries](architecture.md#roles-and-boundaries) | Four IQs live; Copilot Studio and Agent 365 discussed |
| **Architect:** governance model: register, owner, access, review, change, retire | [Lifecycle](governance-and-operations.md#the-lifecycle-of-an-ai-capability); step 7 | Documented; definitions and approvals in this repository |
| **Architect:** governance and cost in the scenario | [Governance and cost](governance-and-operations.md#governance-and-cost-in-the-scenario) | Documented |
| **Architect:** pilot-to-scale evidence path | [Decision record](decision-record.md#from-demo-to-pilot-to-scale) | Documented |
| **Service owner:** operating model across customer, Microsoft and partner | [Operating model](governance-and-operations.md#service-operating-model) | Documented |
| **Service owner:** meaning and ownership as data changes | Step 6; [meaning and ownership](governance-and-operations.md#how-meaning-and-ownership-stay-reliable-as-data-changes) | Live and in the repository |
| **Service owner:** data owners and stewards resolve a governance issue | Step 5; [stewardship](governance-and-operations.md#how-data-owners-and-stewards-resolve-a-governance-issue) | Live flag; documented process |
| **Service owner:** quality and fitness over time | Step 8; [quality](governance-and-operations.md#quality-and-fitness-over-time) | Offline checks live; cases documented |
| **Service owner:** workforce roles | [Workforce roles](governance-and-operations.md#workforce-roles) | Documented |
| **Analyst:** a useful knowledge-work scenario | Steps 1 and 3 | Live |
| **Analyst:** business data made understandable, from source through meaning, ownership and quality to a decision | Steps 5 and 6; [scenario data](../../scenario/data/README.md) | Live and in the repository |
| **Analyst:** access rights carry through; sources identified; decisions and agent activity reviewable | Steps 1, 2, 4 and 7 | Live; second-user cases with a second account |
| **Analyst:** external information: credibility, currency, permitted use, internal versus external | Steps 1 and 3 (Web IQ, then `CS-EXTERNAL-14`) | Live, labelled, public-only queries |
| Capability selection with the existing Azure AI Landing Zone | [Capability selection](capability-selection.md) | Documented |

## If something goes wrong on stage

| Symptom | Do |
| --- | --- |
| Every with-IQ answer fails within seconds while the without-IQ one answers | The Fabric capacity is paused: resume it and ask again |
| A consent card appears | Accept it in the new tab and ask again: per-user consent is part of the story |
| Work IQ finds no mail | The demo mail isn't indexed yet: continue without it, or use mock mode |
| No answer within the time limit | Ask once more; a cold Fabric IQ query can be slow. Otherwise switch to mock mode and say so |

The [runtime troubleshooting table](../runtime-integration.md#troubleshooting) covers the rest.
