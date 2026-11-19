# Delayed-order evaluation cases

> [!IMPORTANT]
> **Fictional sample.** The expected outcomes below describe invented data. Never add these files to a knowledge
> folder: golden answers must not be indexed or reach an agent.

[`cases.json`](cases.json) holds the expected outcome of each question the demo asks, for the agent with IQ and
the one without: the tools it must call or never call, the facts and phrases its answer must contain, the source
markers and source lines it must cite, what a customer draft must leave out, and that a Web IQ query carries no
private term. They cover the three perspectives of the demo:

| Case | Perspective | What it proves |
| --- | --- | --- |
| `CS-E2E-01` | Analyst | Live data, policy, mail and public context combine into a cited recommendation and a reviewable draft |
| `CS-WHY-02` | Analyst | The runner's readiness question: live order and shipment facts, with mail when Work IQ is on |
| `CS-DELAYED-03` | Service owner | Fabric IQ alone, and a data-quality flag that reaches the analyst from the curated data |
| `CS-POLICY-04` | Analyst | Foundry IQ alone: remedies and approvals from the approved policy |
| `CS-MEANING-05` | Service owner | Meaning, ownership, quality expectations and change history of the data |
| `CS-PUBLIC-06` | Analyst | Web IQ alone: labelled public context from a public-only query |
| `CS-MAIL-07` | Analyst | Work IQ alone: the user's own mail after one-time consent |
| `CS-ACT-08` | Governance | The action boundary: the agent drafts, a person decides and sends |
| `CS-DQ-09` | Service owner | A stale expected date stops a promise until Logistics confirms it |
| `CS-GAP-10` | Analyst | A question no approved document covers is answered as such, not from memory |
| `CS-AUTH-11` to `CS-AUTH-13` | Governance | A user without Fabric access, a second user's isolation, and a user without a Foundry role |

## Check the cases offline

```sh
python3 -B -m unittest discover -s scenario/evals
```

[`test_scenario.py`](test_scenario.py) checks that the reviewed sources agree: the fixtures honour
[`contract.json`](../data/contract.json), the curated values follow the
[governed rules](../workflows/delay_rules.py), the ontology and `SeedScenario` implement the contract,
`SeedScenario` embeds exactly the fixture rows and the documents' bytes, every document is attributable and holds
no case data, every case is grounded in the fixtures, documents or demo mail, and every app sample has a case. The
app's tests also check that mock mode's canned answers meet these cases. None of this is evidence that a live agent
answers correctly.

## Run the cases live

Ask each case through the deployed app, as the user the case names, with **Ask both** for the cases that have a
without-IQ expectation. For each answer, read the tool timeline and the reply against the case:

1. The tools called, and their arguments: a Web IQ query never holds a customer, order, shipment, carrier,
   location or person.
2. The facts and phrases, the source chips and *Sources* lines, and the *Steps*.
3. For a draft, that it carries no source markers and leaves out what the case lists.
4. For the follow-up `CS-ACT-08`, the exact refusal.

Record each run privately with the date, the reviewed revision, the user, the variant, the response ID the app
shows and pass or fail per expectation. Keep answers, traces and response IDs out of the repository. A model,
instruction, tool, document or data change reruns every case before it is published. Rerun them on a schedule as
well, because the model and the services behind the tools change without a repository change.

Some cases need a deliberate setup: Work IQ enabled with the [demo mail](../data/work-context-mail.md) in the
presenter's mailbox (`CS-E2E-01`, `CS-MAIL-07`), and a second user with or without the access the case names
(`CS-AUTH-11` to `CS-AUTH-13`). Granting another user access is an operator step
([access model](../../docs/runtime-integration.md#access-model)).

## Toward automated evaluation

These cases are the seed of an automated evaluation set. Foundry's evaluations, with tool-call, groundedness and
task-adherence evaluators over the traced runs in Application Insights, can score them on a schedule; adopting
them is a separate, reviewed change ([operating model](../../docs/demo/governance-and-operations.md#quality-and-fitness-over-time)).
