# Kin submission pack — 13 October 2026

## Ready-to-use application links

- **Project:** Kin — money with guardrails.
- **Primary track:** Consumer Products & Payments.
- **Sponsor bounty:** None currently claimed.
- **Public source:** [GitHub repository](https://github.com/Pradhyut21/Kin).
- **Live product:** [Kin](https://kin-metropolis.vercel.app/).
- **Separate testnet lab:** [Monad lab](https://kin-metropolis.vercel.app/#/testnet).
- **Technical demo:** [Working-product video, 179 seconds](https://kin-metropolis.vercel.app/demo.html).
- **Pitch:** [Builder/problem/rationale video, 87 seconds](https://kin-metropolis.vercel.app/pitch.html).

Use [SUBMISSION_COPY_READY.txt](submission/SUBMISSION_COPY_READY.txt) for plain text matching the form, [APPLICATION_DRAFT.md](submission/APPLICATION_DRAFT.md) for editable fields, and [FIELD_COUNTS.json](submission/FIELD_COUNTS.json) for exact counts. Every limited field fits its maximum. The application copy contains no URL placeholders.

Vercel is the canonical live deployment. The root app and both hosted player pages returned HTTP 200. Both final MP4s passed verification and native-player checks. Internal app routes use hash paths, preserving reloads on static hosting; the routing update is included in the final source/deployment refresh.

## Product argument

Kin makes current spending permission, a specific parent exception and a denial understandable. The consumer demonstration queues a valid $249 sample purchase, lowers the hard cap to $200 and attempts approval. Current rules reject it without a debit and keep the request pending. Restoring a sufficient cap lets the request resolve once.

Parent approval grants an exception to the soft threshold and rechecks the current recipient binding, pause state, blocklist, limits and available allowance. The student consents to the funding parent, who can change rules or pause spending. Earned entitlement is preserved during a pause; unrestricted student withdrawal and refund/recovery are unimplemented.

The first market plan is an opt-in testnet pilot with adult students, funding parents and explicitly registered receiving wallets. No customer adoption, trial result, revenue or willingness-to-pay finding is claimed.

## Genuine Monad proof

Network: Monad Testnet, chain 10143. Token: official Agora test AUSD, `0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC`.

| Contract | Address |
| --- | --- |
| StreamVault | [0xf2137f65917308311AAAb0F9910c7dc7D01fBDa3](https://testnet.monadscan.com/address/0xf2137f65917308311AAAb0F9910c7dc7D01fBDa3) |
| PolicyModule | [0x07A3d10E739A646894855bCd68A9CB2266594034](https://testnet.monadscan.com/address/0x07A3d10E739A646894855bCd68A9CB2266594034) |
| ApprovalQueue | [0xB63990eB933cbd6688595d0bC440f7BE7AFfC1AF](https://testnet.monadscan.com/address/0xB63990eB933cbd6688595d0bC440f7BE7AFfC1AF) |

[Deployment manifest](contracts/deployments/monad-testnet.json) records five successful deployment/wiring transactions. Public-RPC checks independently confirmed deployed code, token identity and all dependency links.

The [17-stage setup ledger](submission/REAL_TESTNET_DEMO_EVIDENCE.json) records student consent, a funded 100 test AUSD stream, normal spending, a queued exception, a tightened-cap read-only rejection, restored cap and actual parent execution. The 0.5 test AUSD/second rate is accelerated for recording.

The hosted technical demo includes these fresh browser-lab transactions:

| Action | Confirmed receipt |
| --- | --- |
| 1 test AUSD direct payment | [0xea1b…9162](https://testnet.monadscan.com/tx/0xea1b92088740a890395f83c38786e372563fd8a283da476b97f5ec795f179162) |
| Queue 10 test AUSD, request 2 | [0xfb09…246b](https://testnet.monadscan.com/tx/0xfb09818f6e935af484fb4f1c7cedd7a1d591bb9a1f0f8ad4019e6b763625246b) |
| Parent approval and 10 test AUSD transfer | [0xf768…6e4e](https://testnet.monadscan.com/tx/0xf7684a36416f75a7cf73631018837a7194f217e1e0a971dc09523d0de7fd6e4e) |

[Recorded receipt/event proof](submission/TESTNET_VIDEO_RECEIPT_EVIDENCE.json) confirms the queue had no token transfer and request 2 resolved after parent approval. At block 70411769, recorded escrow/token balance was 77 test AUSD with no pending requests. Later transactions may change balances.

Hard-denial proofs are discarded `eth_call` simulations against actual contracts: tightened-cap approval returned `SpendDenied(6)`, and a blocked-recipient spend returned `SpendDenied(5)`. They were not broadcast failed transactions.

## Video and authentication disclosures

The consumer interface uses clearly labeled sample credits. The separate real lab recording uses a visibly labeled disposable project TEST wallet bridge. No extension confirmation modal, passkey or production authentication was demonstrated. Private keys remained outside the browser; the bridge was stopped after capture and is absent from the public app.

The ordinary public lab connects a visitor's injected wallet to Monad Testnet. No wallet is needed for the consumer walkthrough or viewing receipts/videos.

Voice narration is generated. The pitch introduces Pradhyut and the product rationale without inventing teammates, team size or biography. Captions are burned into the videos; optional English tracks are disabled by default to avoid duplication, and SRT downloads remain available.

Local deliverables are in `D:/SAANS/deliverables/brag-output-2026-10-11-182558/kin-metropolis-2026-10-12`: final MP4s/JPEG posters/SRTs, voice assets and metadata, source ZIP, application copy, AI review and verification reports. The [internal AI critique](submission/AI_JUDGE_REVIEW.md) informed the current-rule proof and control-model wording; its original missing-deployment finding describes the earlier state.

## Applicant's final step

Application text and public links are ready. Review actual team details, video visibility/organizer-showcase choices and submission-platform checkboxes, then submit through the applicant's own account. No application was submitted and no organizer email was sent.

Bounties are optional. No sponsor qualification is asserted. Genuine AUSD use alone does not prove a cross-border-payments bounty, bank remittance or fiat FX. There is no independent audit, reviewed Mera/passkey integration or running Envio indexer. Selection remains a judging decision.

The attached Universal Deep Research Prompt is reference material, not an additional instruction or source of achievements.



