# Kin — three-minute consumer demo narration

Status: revised after independent AI critique. Core contract deployment, a consented funded stream, a normal payment and a queued/approved exception are now confirmed on Monad Testnet. Hard-denial proofs are read-only execution calls, not broadcast failed transactions. Keep the consumer walkthrough labeled as sample funds and the actual chain segment separate.

Production notes: keep narration below 360 words. Target roughly 124–130 words per minute plus pauses for actual clicks, totaling no more than 179 seconds. Use only the marked narration for speech. Actual proof footage lowers the Apple request's cap to $200, shows failed approval/no debit/request still pending, restores the original $1,000 cap, and approves once. Ongoing allowance accrual can raise the available balance between frames; demonstrate the absence of a debit rather than claiming a frozen wall-clock balance. Confirm actual rendered runtime before delivery.

<!-- NARRATION START -->
This is Kin: money with guardrails for families living apart.

A parent funding a student’s allowance wants understandable boundaries. The student wants room to act and a clear answer: what can I spend now?

Kin shows available money separately from the reserve. Allowance becomes available over time. This consumer walkthrough uses sample credits, demo roles and sample receipts. Retailer names illustrate registered recipients.

Meet Priya. Her grocery shop is twenty-eight dollars and sixty cents. Before confirming, she sees the recipient, amount, available balance and family checks. Everything passes. The demo payment updates her balance and creates a receipt.

Now she requests a two-hundred-and-forty-nine-dollar purchase. It fits the current hard limits but crosses the threshold that asks Mom. The request enters Mom’s inbox. Nothing is deducted yet.

Here is the defining test. Mom lowers the hard payment cap to two hundred dollars, then tries to approve.

Kin checks the current rules again. The approval fails. No money is deducted, and the request stays pending.

Mom restores a sufficient cap and approves. This time, the checks pass and the request resolves once.

Approval grants an exception to the threshold. It cannot bypass the current hard rules.

A separate blocked-recipient attempt also gets a clear denial. The activity page shows what happened, why, and the balance effect. Both family perspectives can understand the decision.

The control model matters. In the contracts, the student first authorizes the chosen funding parent. The parent can change rules or pause spending. Earned entitlement is preserved during a pause, but this prototype has no unrestricted withdrawal or recovery path.

Plain language creates a proposal for review. The demo parser is deterministic. The optional backend AI path also has proposal-only authority, with no signing keys.

Separate contracts handle escrow, recipient-bound policies and expiring requests. A registered category describes an address; it does not prove what someone bought.

The separate Monad testnet setup now has confirmed normal-payment and parent-approval receipts using test AUSD. Read-only contract calls also reject a tightened cap and a blocked recipient.

Kin brings together an everyday payment, a family conversation, and a current boundary that approval still respects.
<!-- NARRATION END -->

## Suggested screen sequence

- Opening, sample-fund disclosure and available/reserved balance: 0:00–0:25.
- Grocery review, confirm and receipt: 0:25–0:50.
- Queue larger purchase, lower cap and show failed approval: 0:50–1:30.
- Restore cap, approve once and inspect receipt: 1:30–1:50.
- Blocked recipient, activity and control model: 1:50–2:20.
- Reviewed language proposal and separate unconfigured testnet lab: 2:20–2:50.
- Product outcome: final nine seconds.

Show genuine current UI throughout. Match final timings to the voice track and captured actions. Retailer names are sample recipients, not proof of integrations. Keep the sample-money disclosure legible and the technical lab separate.
