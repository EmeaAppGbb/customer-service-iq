# Capability selection: Microsoft IQ in the wider portfolio

> [!IMPORTANT]
> Product status and cost models were checked on 19 November 2026. Confirm them on the linked pages, and get
> prices for your agreement from your Microsoft account team.

Once the [architecture](architecture.md) is clear, the practical question is which Microsoft capability a
solution should use. This guide follows Microsoft's own decision order
([CAF: choose an agent approach](https://learn.microsoft.com/azure/cloud-adoption-framework/ai-agents/executive-strategy))
and takes an existing Azure AI Landing Zone into account.

## Decide in this order

1. **Does the task need generative AI at all?** Rules, calculations and approvals with fixed steps belong in
   code, data pipelines or workflows, not in an agent. The scenario's delay calculation is a data rule, and a
   credit approval is a workflow.
2. **Is an existing SaaS experience enough?** If a person only needs to find and summarize their own work
   context, Microsoft 365 Copilot, with Work IQ built in, needs no build. A Fabric data agent answers analytical
   questions over governed data without custom orchestration.
3. **Low-code or pro-code?** Copilot Studio suits makers, conversational agents, Microsoft 365 channels and agent
   flows inside Power Platform governance. Microsoft Foundry suits developers who need model choice, MCP tools
   with explicit identities, evaluations, tracing and an API to embed in their own apps.
4. **Custom Azure development** only where the platform's agents can't meet a requirement, such as a long-running
   process, a specialist runtime or an existing application's backend; prefer Foundry hosted agents over
   self-managed containers.
5. **One agent first.** Split into several agents only when the work crosses security or compliance boundaries,
   spans teams or will clearly grow.

## The options

| Option | Best for | In this scenario | A simpler choice when | Dependencies | Maturity (Nov 2026) | Cost model |
| --- | --- | --- | --- | --- | --- | --- |
| **Microsoft 365 Copilot** | Individual productivity across mail, meetings, files and chats | Not the orchestrator: it can't reach the order data or apply the policy without extension. A channel for the published agent | The analyst only needs to summarize their own mail about a case | Microsoft 365 licences; Work IQ | GA | Per-user licence; agents and Work IQ API calls in Copilot Credits |
| **Copilot Studio** | Maker-built agents, Teams and Microsoft 365 channels, agent flows with human approvals | An alternative build of the same assistant, or its channel; agent flows for the credit approval | A policy Q&A agent over approved documents, with no live data | Power Platform environment, data policies, Copilot Credits | GA; connected Foundry agents partly in preview | Copilot Credits per use |
| **Power Automate** | Deterministic workflows and approvals | The team lead's approval of a service credit, outside the agent | Always, for fixed approval steps | Connectors, Dataverse for long-running approvals | GA | Per user, per process or pay-as-you-go |
| **Microsoft Fabric with Fabric IQ** | Governed business data, its meaning and relationships, as the user | **Used:** the live customer, order and shipment facts | A semantic model or a Fabric data agent, for analytics questions | Fabric capacity, OneLake security, ontology tenant settings | Data agents GA; ontology and the Foundry tool in preview | Fabric capacity units |
| **Foundry IQ (Azure AI Search)** | Permission-aware retrieval over enterprise documents | **Used:** the policy, guideline, customs note and data definitions | Copilot Studio or Microsoft 365 Copilot knowledge, for a small static corpus | Search service, embedding and chat models | Agentic retrieval GA; agent MCP connection and MCP sources in preview | Search tier plus retrieval and model tokens |
| **Work IQ** | The user's own work context in Microsoft 365 | **Used:** the analyst's mail about the order | Microsoft 365 Copilot itself, when no custom agent is needed | Tenant enablement, spending policy, consent | APIs GA; several features in preview | Copilot Credits per call |
| **Web IQ** | Cited public web context | **Used:** one labelled line of public context | No web context at all, when public data adds little | Web IQ terms, AppID and key; public endpoint | APIs GA | Per 1,000 calls |
| **Microsoft Foundry** | Pro-code agents with chosen models, MCP tools, identities, evaluations and tracing | **Used:** the prompt agents with and without IQ | Copilot Studio, when a maker can build and own it | Foundry project, model quota, Application Insights | Prompt agents, tracing, evaluations GA | Model tokens and tool meters; no charge for prompt agents |
| **Agent 365** | One registry and control plane for every agent, with Entra Agent ID, owners, access and audit | Registers and governs the Foundry agents | Per-platform admin centers, for a single small agent | Agent 365 licences for the people who manage, sponsor or use agents | GA since 1 May 2026 | Per user |
| **Custom Azure development** | Long-running processes, specialist runtimes, existing application backends | Only the app's thin server, which verifies tokens and forwards questions | Always prefer platform agents first | Azure landing zone, a CI/CD and run team | GA | Azure consumption |

## What the scenario uses, and why

- **Fabric IQ** for current facts, because business data must be queried live as the user, with its meaning and
  ownership defined once.
- **Foundry IQ** for policy and definitions, because they are curated documents with owners and versions.
- **Work IQ** for the analyst's work context, because it already respects their mailbox permissions.
- **Web IQ** for public context only, because it is useful background and must stay visibly separate.
- **Foundry** to orchestrate, because the comparison with and without IQ, explicit tool identities, evaluations
  and tracing are first-class there.
- **People and workflows** for decisions: the credit approval belongs in Power Automate or a Copilot Studio agent
  flow, and sending stays with the analyst.

Where it is enough, prefer the simpler path: Microsoft 365 Copilot for personal work context, a Copilot Studio
agent for a document-only Q&A, and a Fabric data agent for analytics over the lakehouse.

## With an existing Azure AI Landing Zone

- Deploy Foundry, Search, the container app and Application Insights into a workload subscription and spoke of
  the existing landing zone; reuse its hub network, private DNS, Azure Policy and monitoring.
- Route model traffic through the existing AI gateway in Azure API Management where one exists; MCP governance
  through the gateway is in preview.
- Treat Fabric, Microsoft 365, Copilot Studio and Agent 365 as SaaS surfaces, governed through Entra, Purview,
  Defender and their admin centers.
- Plan around the networking constraints: Web IQ is public only; the Fabric ontology supports tenant-level private
  links only; serverless Search runs no private indexers.
- The reference implementation, [Azure AI Landing Zones](https://github.com/Azure/AI-Landing-Zones), is in
  preview: use it as a design checklist rather than a dependency.
