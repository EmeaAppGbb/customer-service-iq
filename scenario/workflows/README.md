# Delayed-order workflow rules

[`delay_rules.py`](delay_rules.py) holds the scenario's governed calculations, each a rule in the
[data contract](../data/contract.json):

| Rule | Function | Contract rule |
| --- | --- | --- |
| Business days late: Monday to Friday after the promised date, up to the carrier's expected date | `business_days_late` | DQ-02 |
| The derived order status: Open, In transit, Delayed or Delivered | `order_status` | DQ-03 |
| An expected date's freshness: Stale after more than one business day without a carrier event | `eta_is_stale` | DQ-05 |

In a production pipeline the curated data layer runs these rules; in this sample, `SeedScenario` carries their
results in its reviewed rows, and [`scenario/evals`](../evals/) checks that the two agree. The agents never run
them: they read `DelayBusinessDays`, `OrderStatus` and `EtaFreshness` from the live ontology. Nothing here is a
backend, a tool or a Fabric runtime module.
