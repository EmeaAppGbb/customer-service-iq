# Work-context mail for the delayed-order demo

> [!IMPORTANT]
> **Fictional sample.** These two messages are invented demo content. Send them deliberately into the
> presenter's own mailbox; never forward or copy real mail for the demo.

Work IQ reads only the signed-in user's own mailbox, after Microsoft 365 has indexed it. With
`work_iq_enabled = true`, put these messages into the presenter's mailbox **at least a day before the demo**:
send them from two colleagues' demo accounts or from the presenter to themselves. Keep each subject and the
order number `SO-48213` exactly as written: the with-IQ agent searches the mailbox for the order number. The
agent cites each message by the sender Outlook shows, its date and its link.

Without Work IQ, skip this step: the agent has no mail tool, and the demo shows that the analyst's work context
is missing.

## Message 1, from the logistics coordinator

**Subject:** SO-48213 / SHP-7781 customs hold: corrected documents filed

> Hi,
>
> Update on Fabrikam Retail's order SO-48213. Shipment SHP-7781 is held at the Eastport import hub because the
> commercial invoice listed a tariff code that did not match the packing list. Our customs broker filed
> corrected documents on Tuesday 17 November 2026. Consolidated Messenger expects to release the shipment on
> Thursday 19 November 2026 and to deliver it on Friday 20 November 2026. I'll confirm as soon as the hold is
> lifted.
>
> Please don't share the broker's name or the tariff details with the customer.
>
> Logistics coordinator

## Message 2, from the account manager

**Subject:** Fabrikam Retail: SO-48213 needed before store opening

> Hi,
>
> Fabrikam Retail's buyer called this morning about order SO-48213. They need the store fixtures installed
> before their new store opens on Tuesday 24 November 2026. Please reply to them today and copy me. I support
> offering expedited delivery as soon as the shipment is released.
>
> Account manager

## What each message adds

| Message | Adds to the answer | Governance point |
| --- | --- | --- |
| 1 | Why the shipment is held and what Logistics expects, which the live data doesn't hold | Mail is what a colleague reported, not current status: the live data stays authoritative, and the agent keeps the broker and tariff details out of the customer draft |
| 2 | The customer's deadline and the account manager's request to be copied | Work context informs the analyst's decision; the offer still follows the policy and its approvals |
