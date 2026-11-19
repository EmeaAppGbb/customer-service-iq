"""The scenario's governed order rules: business days late, the derived order status and carrier ETA freshness.

They define demo_orders.delay_business_days and demo_orders.order_status, and the freshness rule, in
scenario/data/contract.json (DQ-02, DQ-03 and DQ-05). The curated data layer owns these calculations, not the
agents: an agent reads DelayBusinessDays from the live ontology and never works out a delay itself. SeedScenario
carries the resulting values in its reviewed payload, and scenario/evals checks that the two agree. Nothing here
runs in Fabric or in an agent.
"""

from datetime import date, timedelta


def is_business_day(day):
    """Monday to Friday. Public holidays are not deducted in this scenario."""
    return day.weekday() < 5


def business_days_late(promised, expected):
    """Business days after `promised` up to and including `expected`, or 0 when it is on time or not known."""
    if not isinstance(promised, date) or (expected is not None and not isinstance(expected, date)):
        raise TypeError("business_days_late takes dates.")
    if expected is None or expected <= promised:
        return 0
    days, current = 0, promised
    while current < expected:
        current += timedelta(days=1)
        days += is_business_day(current)
    return days


def order_status(shipment_status, delay_business_days):
    """Open without a shipment, Delivered once delivered, Delayed when late, otherwise In transit."""
    if delay_business_days < 0:
        raise ValueError("A delay can't be negative.")
    if shipment_status is None:
        return "Open"
    if shipment_status == "Delivered":
        return "Delivered"
    return "Delayed" if delay_business_days > 0 else "In transit"


def eta_is_stale(shipment_status, last_update, as_of):
    """A shipment not yet delivered whose latest carrier event is more than one business day before `as_of`."""
    if shipment_status == "Delivered":
        return False
    return business_days_late(last_update, as_of) > 1
