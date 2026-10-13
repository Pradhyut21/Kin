# Kin — final Metropolis application copy

Prepared 13 October 2026. All application fields below contain verified public links and remain within their stated limits. Primary track: Consumer Products & Payments. No sponsor bounty is claimed. Copy only the body between a field's START and END markers, or use SUBMISSION_COPY_READY.txt without markers.

The public Site deployment succeeded. The technical demo is 179 seconds and the pitch is 87 seconds; both final renders passed verification. The consumer sample-credit flow and genuine Monad Testnet lab are distinct. No application submission or organizer email was performed.

## PROJECT NAME — maximum 120 characters

<!-- FIELD:project_name START -->
Kin — money with guardrails
<!-- FIELD:project_name END -->

## ONE LINE DESCRIPTION — maximum 200 characters

<!-- FIELD:tagline START -->
A family allowance for life apart: money unlocks over time, everyday spending follows clear rules, and bigger plans ask a parent. Hard boundaries stay intact.
<!-- FIELD:tagline END -->

## DESCRIPTION — maximum 8,000 characters

<!-- FIELD:product_description START -->
A transfer tells a parent that money arrived. Kin answers the next three questions: what can be spent now, what needs a conversation, and why was a payment declined?

Kin is money with guardrails for families living apart. Our starting use case is a parent funding an adult student's allowance. The student sees money available now separately from the prepaid reserve, reviews a recipient and amount, and gets a clear outcome:

• Within the current rules: confirm the payment.
• Above the approval threshold: ask a parent, with no debit while the request is pending.
• Outside a current hard boundary: explain the reason and deduct nothing.

The defining interaction is a rule change while a request waits. Queue a valid $249 purchase, lower the hard payment cap to $200, and attempt parent approval. Kin rejects the approval, deducts nothing and keeps the request pending. Restore a sufficient cap and the same request can be approved once. Approval grants an exception to the soft threshold; it cannot bypass the current hard rules.

That distinction gives both people a precise understanding of an exception. The review card shows the recipient, amount and checks. The parent sees the specific request. The receipt shows the decision and balance effect. Every approval rechecks the current recipient binding, blocklist, pause state, limits and available allowance.

The control model is explicit. The student consents to the chosen funding parent before stream creation. The parent can change spending rules or pause the stream. A pause freezes accrual and spending while preserving earned entitlement. The prototype has no unrestricted withdrawal or refund/recovery path. Kin's intended independence is room to act within transparent funding rules.

The consumer walkthrough shows a $28.60 grocery payment, a $249 exception and a $25 blocked-recipient attempt. These are labeled sample-credit scenarios. Retailer names illustrate registered recipients and do not represent merchant integrations. Categories are bound to parent-registered addresses; they cannot prove the goods purchased or prevent a recipient's misuse of funds.

Three Solidity components separate the responsibilities. StreamVault escrows the supported token and calculates earned allowance from elapsed time. PolicyModule enforces recipient-bound policies and budgets. ApprovalQueue authenticates the recorded parent and makes requests single-use with a 48-hour expiry. Pending requests do not reserve funds, so the available balance is checked again at execution.

Onchain enforcement makes escrow, earned entitlement and exception rules independently inspectable. Kin's core contracts are deployed on Monad Testnet, chain 10143. Allowance is calculated from elapsed time and checkpointed during a transaction; accrual does not require a transaction every second.

Plain language reduces typing while preserving review. The embedded demo parser is deterministic. The optional backend language-model path produces untrusted proposals only; it has no signing keys and cannot execute payments or change rules.

Working now: the public consumer prototype uses labeled sample credits, and a separate wallet-based lab connects to deployed Monad Testnet contracts. The recorded real lab completed a 1 test AUSD payment, queued a 10 test AUSD request without a transfer, and executed the parent's approval. Confirmed receipts, events and recipient balances establish those transfers. A separate setup funded a consented 100 test AUSD stream and checked hard denials through read-only RPC calls. The tightened-cap and blocked-recipient rejection proofs are simulations, not broadcast failed transactions. Consumer sample receipts and genuine testnet receipts remain separate.

Our primary track is Consumer Products & Payments. Streaming and spending limits already exist; Kin's contribution is an explainable payment, exception and denial loop that demonstrates exactly what parent approval can authorize. Our proposed first pilot pairs adult students and funding parents using registered receiving wallets, then tests whether both people understand the rules and choose to use the flow again.
<!-- FIELD:product_description END -->

## GO TO MARKET AND USER ACQUISITION STRATEGY — maximum 8,000 characters

<!-- FIELD:go_to_market START -->
Our proposed launch starts with one specific audience: adult students living away from home who receive a family allowance. The student is the first user; a parent joins as the funding partner. We want to learn whether transparent rules and specific exception requests help both people, including whether a rule feels useful or controlling.

Phase 1 — validate the experience with a free, opt-in, testnet-only pilot.

Recruit a small initial group through crypto-native student communities, Monad builder circles and personal introductions. These are proposed channels, not existing partnerships. Begin with five adult student/funding-parent pairs already comfortable using test wallets. Each pair would use explicitly registered receiving wallets. Retail checkout and fiat cashout are unimplemented; a retailer's sample label does not imply it accepts Kin. Explain the constraints before onboarding: recipient registration is not merchant verification, the parent can change limits and pause spending, transactions are public, and refund/recovery is not implemented. No real-money deposit would be requested in this phase.

Each pair should complete the same three tasks: an everyday transfer, an exception request and a hard denial after a rule change. Interview the student and parent separately. Ask which recurring transfers to registered wallets would actually help, whether the funding controls feel useful, and whether the public payment metadata is acceptable. Measure time to the first reviewed payment, confusion about reserved versus available funds, comprehension of denial reasons, approval friction and willingness to repeat the flow. These are planned measurements; we have no measured traction or user-trial results to report yet.

Phase 2 — earn retention through a recurring family use case.

With Monad execution proof recorded, the next step is pilot feedback on the highest-friction steps: reviewed consumer wallet signing, understandable setup, matching budget-reset semantics, privacy choices and a clear exit/recovery design. Expanding to real funds would require those protections and appropriate independent review. A family should understand the limits and voluntarily choose this funding arrangement before using it.

The proposed acquisition loop is student-led: a student tries the free walkthrough, invites a funding parent, and both see a concrete weekly allowance experience. Share the short working-product demo and onboarding guide in relevant communities. Use voluntary referrals only after families say the product helps them. Do not require public sharing of family balances or payment history to receive a benefit.

Phase 3 — test a sustainable model after demonstrated value.

Keep basic allowance setup and transparent rules free during the pilot. Later, test an optional subscription for useful family-management features, with an explicitly disclosed price and affirmative opt-in. Validate willingness to pay before choosing pricing. Kin has no revenue, acquisition-cost or market-size claim in this application; no hidden transfer spread or sponsor credit is counted as revenue.

The first go-to-market milestone is a family completing the payment/exception/denial flow and correctly explaining all three outcomes. The next is choosing to use it again. Our positioning is everyday independence within transparent boundaries, with every exception understandable to the person asking and the person approving.
<!-- FIELD:go_to_market END -->

## GITHUB REPO

<!-- FIELD:github_repo START -->
https://github.com/Pradhyut21/Kin
<!-- FIELD:github_repo END -->

## LIVE PROJECT LINK

<!-- FIELD:live_project_link START -->
https://kin-metropolis.vercel.app/
<!-- FIELD:live_project_link END -->

## TECHNICAL DEMO VIDEO — 179 seconds

<!-- FIELD:technical_demo_video START -->
https://kin-metropolis.vercel.app/demo.html
<!-- FIELD:technical_demo_video END -->

## PITCH VIDEO — 87 seconds

<!-- FIELD:pitch_video START -->
https://kin-metropolis.vercel.app/pitch.html
<!-- FIELD:pitch_video END -->

## JUDGE INSTRUCTIONS — maximum 8,000 characters

<!-- FIELD:judge_instructions START -->
Primary track: Consumer Products & Payments.
Sponsor bounties: none currently claimed.

Live product: https://kin-metropolis.vercel.app/
Separate testnet lab: https://kin-metropolis.vercel.app/#/testnet
Technical demo: https://kin-metropolis.vercel.app/demo.html — 179 seconds.
Pitch: https://kin-metropolis.vercel.app/pitch.html — 87 seconds.
Public source: https://github.com/Pradhyut21/Kin

Start with the consumer walkthrough. It requires no wallet or API keys and uses clearly labeled sample credits. The Priya/Mom role switch illustrates two family perspectives; it is not authentication. Use “Reset demo” if returning to a previously used browser state.

1. On Overview, choose “The everyday shop.” Review the Tesco $28.60 sample payment and confirm. Inspect the checks, sample receipt and exact debit in Activity. Retailer names illustrate registered recipients and do not establish merchant integrations.

2. Return to Overview and choose “A bigger little purchase.” Review the Apple $249 sample request and select “Ask Mom.” The request stays pending with no debit. Switch to Mom, open Family rules, and lower the per-payment cap to $200.

3. In Approvals, attempt approval. The current hard cap rejects it without deducting credits, and the request remains pending. Restore the original $1,000 cap and approve. The request resolves once. Allowance accrual may raise the available balance between frames; the rejected approval causes no debit.

4. Switch to Priya and try “A line we don't cross.” The Lucky Spins $25 sample attempt is blocked. Parent approval cannot bypass the current blocklist or hard limits. The parent can separately change the rules.

5. Inspect Family rules and Activity. In Plain language, try “Pay Tesco $28.60” and review the proposal before confirming. The embedded parser is deterministic. The optional backend AI path is proposal-only and has no signing authority.

The separate real Monad segment in the technical demo shows the working browser lab and genuine test-token transactions. Its recording uses a visibly labeled disposable project TEST wallet bridge. No extension confirmation modal, passkey or production authentication is claimed. Private keys stayed outside the browser; the bridge was stopped after recording and is not included in the public app.

Recorded normal 1 test AUSD transfer:
https://testnet.monadscan.com/tx/0xea1b92088740a890395f83c38786e372563fd8a283da476b97f5ec795f179162

Recorded queued 10 test AUSD request 2, with no token transfer:
https://testnet.monadscan.com/tx/0xfb09818f6e935af484fb4f1c7cedd7a1d591bb9a1f0f8ad4019e6b763625246b

Recorded parent approval and 10 test AUSD execution:
https://testnet.monadscan.com/tx/0xf7684a36416f75a7cf73631018837a7194f217e1e0a971dc09523d0de7fd6e4e

Contracts on Monad Testnet, chain 10143:
StreamVault 0xf2137f65917308311AAAb0F9910c7dc7D01fBDa3
PolicyModule 0x07A3d10E739A646894855bCd68A9CB2266594034
ApprovalQueue 0xB63990eB933cbd6688595d0bC440f7BE7AFfC1AF
Supported Agora test AUSD 0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC, 6 decimals.

The public repository preserves the five deployment/wiring receipts, 17-stage setup ledger and recorded-flow receipt/event proof. In the setup, a pending 10 test AUSD request rejected approval under an 8 test AUSD cap through eth_call, returning SpendDenied(6). Restoring the cap to 20 allowed actual approval. A blocked-recipient eth_call returned SpendDenied(5). These were read-only simulations, not failed transaction receipts.

Stream 1 was funded with 100 test AUSD at an accelerated 0.5 test AUSD/second recording rate. At block 70411769, its recorded escrow/token balance was 77 test AUSD after setup and capture transfers, with no pending requests. Later transactions may change balances. The consumer $249/$200 scenario is separate from these test-token amounts.

To explore your own real testnet setup, open Testnet lab with an injected wallet on Monad Testnet. The student must authorize the chosen funding parent before that parent funds a new stream and registers recipients. Use test MON/test AUSD only. No wallet is needed to view the recorded receipts or complete the consumer sample walkthrough.

Prototype limits: the student consents to the funding parent, who can change rules or pause accrual/spending. Earned entitlement is preserved, but unrestricted student withdrawal and refund/recovery are unimplemented. Recipient categories bind parent-registered addresses; they do not verify goods purchased or prevent misuse after funds arrive. Consumer and contract budget-reset semantics differ. No independent audit, fiat settlement, bank payout, live FX, reviewed Mera/passkey wallet or running Envio indexer is claimed. Onchain metadata is public.

Both videos have generated voice narration and captions. The pitch introduces Pradhyut and the product rationale without inventing teammates or personal history. The videos and source are public. This disposable-wallet test is not a user trial, and the go-to-market pilot remains a proposal.
<!-- FIELD:judge_instructions END -->

## SPONSOR BOUNTY — optional

<!-- FIELD:sponsor_bounty START -->
None currently claimed. Primary track: Consumer Products & Payments.
<!-- FIELD:sponsor_bounty END -->

## PITCH VOICE SCRIPT — generated narration, 205 words

<!-- FIELD:pitch_voice_body START -->
Hi, I am Pradhyut, the builder behind Kin.

Kin is money with guardrails for families living apart.

I am building it because family support should come with understandable choices and a clear meaning for every approval.

A parent funding an adult student’s allowance needs transparent boundaries. The student needs room to act and an answer: what can I spend now?

Kin releases allowance over time. Everyday payments within the rules can proceed. Bigger purchases ask a parent, and every decision has a reason.

The defining test happens when the rules change. Queue a valid purchase, tighten the hard cap, then attempt approval. Kin rejects it without a debit. Restore a sufficient cap, and the request can complete once.

Approval cannot bypass the current hard rules. The student consents to the funding parent, who can change rules or pause spending. Those controls must be understood.

The consumer walkthrough uses sample funds. Separately, our Monad Testnet contracts have confirmed a funded stream, a normal payment and a parent-approved exception using disposable test wallets.

Next, I want to test understanding and repeat use with adult student and funding parent pairs using explicitly registered receiving wallets.

The goal is a family allowance where permissions, exceptions and denials are clear.
<!-- FIELD:pitch_voice_body END -->

## EDITABLE PITCH SCRIPT

<!-- FIELD:pitch_script START -->
Hi, I am Pradhyut, the builder behind Kin.

Kin is money with guardrails for families living apart.

I am building it because family support should come with understandable choices and a clear meaning for every approval.

A parent funding an adult student’s allowance needs transparent boundaries. The student needs room to act and an answer: what can I spend now?

Kin releases allowance over time. Everyday payments within the rules can proceed. Bigger purchases ask a parent, and every decision has a reason.

The defining test happens when the rules change. Queue a valid purchase, tighten the hard cap, then attempt approval. Kin rejects it without a debit. Restore a sufficient cap, and the request can complete once.

Approval cannot bypass the current hard rules. The student consents to the funding parent, who can change rules or pause spending. Those controls must be understood.

The consumer walkthrough uses sample funds. Separately, our Monad Testnet contracts have confirmed a funded stream, a normal payment and a parent-approved exception using disposable test wallets.

Next, I want to test understanding and repeat use with adult student and funding parent pairs using explicitly registered receiving wallets.

The goal is a family allowance where permissions, exceptions and denials are clear.
<!-- FIELD:pitch_script END -->

## Independent AI review and applicant review

The independent internal AI critique identified the current-rule recheck, one-use student consent and understandable decision receipts as concrete strengths. Its suggestions informed the revised copy and rule-change-after-queue demonstration. The original critique predates deployment; subsequent public-RPC and recorded-flow evidence resolves that earlier gap. It is not a Metropolis judging result or independent security audit.

Application text and links are ready. The applicant should review team details, visibility/organizer-showcase choices and the platform's submission checkboxes, then submit through their own account. Add a bounty only after answering its exact questions with genuine integration evidence. No teammates, customer results or winning outcome are invented.
