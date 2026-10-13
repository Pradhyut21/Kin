# Kin — Metropolis application draft

Prepared from the current repository on 12 October 2026. The field names below match the applicant's form. Copy only the body between each field's START and END markers. Character counts are in FIELD_COUNTS.json.

The three core contracts are deployed and wired on Monad Testnet. Public-RPC checks confirm deployment receipts, a consented funded stream, a normal payment and an approved exception. Hard-denial evidence uses read-only execution calls, not broadcast failed transactions. Keep the sample-money consumer walkthrough separate from genuine testnet transfers. Actual repository, public app and hosted video URLs still require final links.

## Project name — maximum 120 characters

<!-- FIELD:project_name START -->
Kin — money with guardrails
<!-- FIELD:project_name END -->

## One-line description — maximum 200 characters

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

Current build: a working responsive consumer prototype with labeled sample funds, deployed and wired Monad Testnet contracts, and a separate wallet-based lab. Disposable test wallets created a consented 100 test AUSD stream, completed a 1 test AUSD payment and queued/approved a 10 test AUSD exception. Confirmed receipts and recipient balances establish those transfers. At a tightened 8 test AUSD cap, a read-only approval call rejected the pending 10 test AUSD request; restoring the cap allowed actual execution. A blocked-recipient call also rejected. These denials were RPC simulations, not broadcast failed transactions. Consumer sample receipts and genuine testnet receipts remain separate.

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

## JUDGE INSTRUCTIONS — maximum 8,000 characters

<!-- FIELD:judge_instructions START -->
Primary track: Consumer Products & Payments.

Current execution status: the consumer walkthrough uses sample credits; no real money moves in that flow. Three core contracts are deployed and wired on Monad Testnet, chain 10143. A consented 100 test AUSD stream, a 1 test AUSD normal payment and a 10 test AUSD queued/approved exception have confirmed receipts. Public-RPC checks independently reproduced code/token/wiring, successful transaction statuses, recipient balances and the hard-denial results. The real flow uses disposable project-specific test wallets. Keep sample receipts separate from genuine testnet receipts.

Consumer walkthrough — approximately two minutes:

1. Open the app and choose “Explore demo” if the onboarding screen appears. Select Priya's demo view. On Overview, see available credits separately from the reserve. Use “Reset demo” if returning to a previously used browser state.

2. Choose “The everyday shop.” Review the Tesco $28.60 sample payment, then confirm. Inspect the decision checks, available-balance change and sample receipt in Activity. Tesco is an illustrative registered recipient, not an integrated retailer.

3. Return to Overview and choose “A bigger little purchase.” Review the Apple $249 sample purchase and select “Ask Mom.” Confirm that the pending request has not debited funds. Switch the visible demo role to Mom. In Family rules, lower the per-payment cap to $200. Open Approvals and attempt approval: the current cap blocks it, no funds are deducted, and the request stays pending. Restore the cap to its original $1,000, then approve. The same request resolves once. Allowance accrual can raise the balance between frames; the denial causes no debit.

4. Switch to Priya and choose “A line we don't cross.” Attempt the Lucky Spins $25 sample payment. Inspect the hard denial and absence of a debit. Parent approval cannot bypass the current blocklist or hard caps. The parent can separately change the rules.

5. Open Family rules and Activity. The review card and receipts explain decisions. In Plain language, try “Pay Tesco $28.60” and see a proposal before confirmation. The embedded parser is deterministic; text alone never moves funds.

The policy-change-after-queue sequence is the central boundary proof. A failing approval leaves the request pending, and the parent can still decline it. A successful resolution consumes the request once.

Real Monad path:

Open Testnet lab separately. It requires a Monad testnet wallet and test AUSD. The deployed addresses are StreamVault 0xf2137f65917308311AAAb0F9910c7dc7D01fBDa3, PolicyModule 0x07A3d10E739A646894855bCd68A9CB2266594034 and ApprovalQueue 0xB63990eB933cbd6688595d0bC440f7BE7AFfC1AF. Supported token: Agora testnet AUSD 0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC. Public deployment manifest: contracts/deployments/monad-testnet.json. The lab verifies token/wiring, onchain signer roles and confirmed receipts; local role switching is not wallet authentication.

Explore the contracts on https://testnet.monadscan.com/address/0xf2137f65917308311AAAb0F9910c7dc7D01fBDa3, https://testnet.monadscan.com/address/0x07A3d10E739A646894855bCd68A9CB2266594034 and https://testnet.monadscan.com/address/0xB63990eB933cbd6688595d0bC440f7BE7AFfC1AF.

Stream 1 was funded with 100 test AUSD at an accelerated 0.5 test AUSD/second rate for recording. This is a test rate, not a realistic allowance recommendation. The real setup used a 20 test AUSD cap and a 5 test AUSD approval threshold. The consumer's $249/$200 example is a separate sample scenario.

Normal 1 test AUSD payment: https://testnet.monadscan.com/tx/0x59a5e21d35854dee1b2dc727a8e81966ac18c976e88651930a8a54c7b824850d.

Queued 10 test AUSD exception: https://testnet.monadscan.com/tx/0x565989bef26d0e4c8f9d50ff8b0b4035791b94b58e511e315f6ae17778d0482a.

Parent approval and 10 test AUSD execution: https://testnet.monadscan.com/tx/0x44c64b738dfd3ea74b1483d281a1efcdf3b44ca21a935a71227c0c1aa188d44d.

Hard-denial proof: after the queued request, the parent set the cap to 8 test AUSD. A read-only eth_call from the funding parent's address to approve(1) returned SpendDenied(6), “Transaction cap exceeded.” The request stayed pending and token balances/escrow were unchanged. After restoring the cap to 20 test AUSD, the actual approval transaction succeeded. A separate eth_call from the student's address to a blocked recipient returned SpendDenied(5), “Recipient is blocked.” Both rejected calls were simulations with no broadcast or gas charge; they are not failed transaction receipts.

The 17-stage public setup ledger is submission/REAL_TESTNET_DEMO_EVIDENCE.json. At block 70409103, escrow was 89 test AUSD after the 1 and 10 test AUSD transfers. Additional captured transactions may change later balances. Neither the disposable-wallet test nor the sample-money walkthrough is a user trial or production launch.

Reproduce locally with Node.js 22.18 or later: run “npm.cmd run setup” and “npm.cmd run dev” from the repository root, then open Vite's printed URL. “npm.cmd run check” builds the frontend/backend and runs local frontend, API, Solidity and indexer-accounting checks. Read README.md and SECURITY.md for setup, boundaries and deployment steps.

Bounties are optional. No sponsor bounty is currently claimed. A testnet token reference does not establish Agora bounty eligibility, an indexer scaffold does not establish a working Envio integration, and the excluded raw-P256 account experiment is not Mera/WebAuthn authentication. Select a bounty only after checking its exact questions and providing a substantive working integration.

Prototype limits: no independent security audit, unrestricted withdrawal, refund/recovery, fiat settlement, live FX, independently verified merchants or reviewed passkey wallet is claimed. The student consents to the chosen funding parent; that parent can change spending rules and pause the stream. Parent pause freezes both spending and accrual while retaining earned entitlement. The consumer and contract budget-reset models differ. Onchain events can expose family relationships and payment metadata. Use test funds only.

Existing work and new event-period work should be described accurately. Archived conceptual documents are retained separately and are not evidence that their historical integration claims are implemented. Preserve dated implementation and validation evidence for eligibility review.
<!-- FIELD:judge_instructions END -->

## GITHUB REPO — verified URL required

<!-- FIELD:github_repo START -->
[ADD THE ACTUAL REPOSITORY URL; PUBLIC OR SHARED WITH THE ORGANIZER]
<!-- FIELD:github_repo END -->

## LIVE PROJECT LINK — reachable URL required

<!-- FIELD:live_project_link START -->
[ADD THE ACTUAL HOSTED PRODUCT URL]
<!-- FIELD:live_project_link END -->

## TECHNICAL DEMO VIDEO — hosted video, maximum three minutes

<!-- FIELD:technical_demo_video START -->
[ADD THE ACTUAL HOSTED WORKING-PRODUCT VIDEO URL]
<!-- FIELD:technical_demo_video END -->

## PITCH VIDEO — hosted video, maximum two minutes

<!-- FIELD:pitch_video START -->
[ADD THE ACTUAL HOSTED PITCH VIDEO URL]
<!-- FIELD:pitch_video END -->

## SPONSOR BOUNTY — optional

<!-- FIELD:sponsor_bounty START -->
None currently claimed. Primary track: Consumer Products & Payments.
<!-- FIELD:sponsor_bounty END -->

## Pitch voice body — product narration introducing Pradhyut, 205 words

The first name matches the verified connected GitHub profile. The motivation is a product rationale; no personal biography, team size or teammate identity is invented. A generated voice can narrate this script, with that generation disclosed. It is not a recording of the applicant's own voice. Confirm the actual rendered duration is below two minutes.

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

## Editable pitch script — ready for applicant review or personal recording

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

## Independent AI review questions

An independent AI reviewer assessed the original draft. Its genuine strengths and critiques are recorded in AI_JUDGE_REVIEW.md. The revised copy incorporates its advice on current-rule enforcement, parent control and registered receiving wallets. That earlier review predates the now-verified Monad deployment and payment evidence; its deployment-gap finding describes the earlier state. This is an internal AI review, not a Metropolis judging result or independent security audit.

Ask reviewers to assess the actual draft, source boundaries and evidence, then incorporate useful suggestions. Seek critique and concrete improvements, not invented praise or a prediction of selection.

1. As a skeptical Consumer Products & Payments judge, what is the strongest reason to shortlist this product? What is the strongest reason to reject it? Ground both in the supplied implementation and evidence.
2. Which sentence overstates deployment, merchant verification, AI integration, security, novelty or user demand? Suggest an accurate replacement with the same persuasive force.
3. Can you explain the product after one reading? Rewrite the opening to make the family benefit and the three payment outcomes clearer without adding claims.
4. Which single proof should the three-minute demo show to make this application credible? Distinguish a consumer sample receipt from an actual Monad receipt.
5. Does the text acknowledge that the parent can change rules or pause spending, and that this prototype has no refund/recovery path? Identify any misleading implication about student control.
6. Suggest one genuine strength that deserves more emphasis and one paragraph that can be cut. Do not manufacture compliments, integrations, metrics or team history.

## Evidence needed before turning this draft into a final application

- Actual public repository/project link, or access shared with the organizer using the applicant's own account.
- Preserve the verified Monad deployment and real spend/approval transaction links already listed in Judge Instructions.
- Reachable product URL and independently reproducible setup.
- Hosted working-product demo, at most three minutes, plus separate pitch, at most two minutes.
- Review the pitch introduction and product rationale, add any actual teammate introductions if appropriate, and answer the questions for any selected bounty.
- A final wording update reflecting completed proof, while retaining the distinction between consumer sample funds and testnet signing.
