# Kin submission pack — 12 October 2026

## Fields ready to copy

**Project name:** Kin — money with guardrails

**One-line description:** A family allowance for life apart: money unlocks over time, everyday spending follows clear rules, and bigger plans ask a parent. Hard boundaries stay intact.

**Primary track:** Consumer Products & Payments.

Use [SUBMISSION_COPY_READY.txt](submission/SUBMISSION_COPY_READY.txt) for plain text with the exact application fields and no HTML markers. The [editable draft](submission/APPLICATION_DRAFT.md) and [FIELD_COUNTS.json](submission/FIELD_COUNTS.json) preserve field boundaries and exact counts. All limited fields are below their maximums.

The pitch introduces Pradhyut as the builder behind Kin and gives a product rationale. It invents no biography, teammates or team size. The voice is synthesized and must be disclosed as narration.

## Product argument

A transfer confirms arrival. Kin makes current spending permission, a specific parent exception and a denial understandable.

The defining consumer demonstration queues a valid $249 sample purchase, lowers the hard cap to $200 and attempts approval. Current rules reject it without a debit and keep the request pending. Restoring a sufficient cap lets the same request resolve once. Parent approval grants an exception to the threshold and rechecks all current hard protections.

The student consents to the funding parent; that parent can change rules or pause spending. Earned entitlement is retained during pauses, but the prototype has no unrestricted withdrawal or refund/recovery path. Merchant labels are parent-registered address categories, not verified retailer integrations.

## Genuine Monad evidence

Network: Monad Testnet, chain 10143. Token: Agora testnet AUSD `0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC`.

| Contract | Explorer |
| --- | --- |
| StreamVault | [0xf2137f65917308311AAAb0F9910c7dc7D01fBDa3](https://testnet.monadscan.com/address/0xf2137f65917308311AAAb0F9910c7dc7D01fBDa3) |
| PolicyModule | [0x07A3d10E739A646894855bCd68A9CB2266594034](https://testnet.monadscan.com/address/0x07A3d10E739A646894855bCd68A9CB2266594034) |
| ApprovalQueue | [0xB63990eB933cbd6688595d0bC440f7BE7AFfC1AF](https://testnet.monadscan.com/address/0xB63990eB933cbd6688595d0bC440f7BE7AFfC1AF) |

[Deployment manifest](contracts/deployments/monad-testnet.json) records five successful deployment/wiring transactions. Deployed code, token identity and dependency links were independently checked through the public RPC. Explorer source verification has not been claimed.

The [17-stage setup ledger](submission/REAL_TESTNET_DEMO_EVIDENCE.json) records student consent, a funded 100 test AUSD stream, a normal spend, a queued exception, cap-change rejection and eventual approval. The 0.5 test AUSD/second rate is explicitly accelerated for recording.

Fresh transactions visible in the separate browser-lab capture:

| Action | Actual confirmed receipt |
| --- | --- |
| 1 test AUSD direct spend | [0xea1b…9162](https://testnet.monadscan.com/tx/0xea1b92088740a890395f83c38786e372563fd8a283da476b97f5ec795f179162) |
| Queue 10 test AUSD, request 2 | [0xfb09…246b](https://testnet.monadscan.com/tx/0xfb09818f6e935af484fb4f1c7cedd7a1d591bb9a1f0f8ad4019e6b763625246b) |
| Parent approval and 10 test AUSD transfer | [0xf768…6e4e](https://testnet.monadscan.com/tx/0xf7684a36416f75a7cf73631018837a7194f217e1e0a971dc09523d0de7fd6e4e) |

[Recorded receipt/event proof](submission/TESTNET_VIDEO_RECEIPT_EVIDENCE.json) confirms the queue had no token transfer, the parent approval emitted execution/transfer events and request 2 resolved. At block 70411769, vault escrow/token balance was 77 test AUSD with no pending requests.

Hard denials were tested as read-only `eth_call` simulations against actual contracts: approval under the tightened cap returned `SpendDenied(6)`; a blocked recipient returned `SpendDenied(5)`. These were discarded RPC simulations, not broadcast failed transactions.

The browser recording uses a visibly labeled disposable project TEST wallet bridge. It does not demonstrate a browser-extension confirmation modal, passkey or production authentication. Private keys stayed outside the browser and the bridge was stopped after capture.

## Demo and pitch delivery status

The media project uses the same Saans brag output location requested by the applicant:

`D:/SAANS/deliverables/brag-output-2026-10-11-182558/kin-metropolis-2026-10-12`

| Deliverable | Planned file | Current status |
| --- | --- | --- |
| Working-product technical demo, at most 3 minutes | `Kin-Technical-Demo.mp4`, target 179 seconds | Composition/voice/captions prepared; final render and QA pending |
| Team/problem/motivation pitch, at most 2 minutes | `Kin-Pitch.mp4`, target 87 seconds | Composition/synthetic voice/captions prepared; final render and QA pending |
| Captions | `Kin-Technical-Demo.srt`, `Kin-Pitch.srt` | Prepared; phrase timing is estimated within verified voice-clip durations, not ASR word alignment |

The technical demo combines the labeled consumer sample-credit flow with a separate actual Monad lab segment. The genuine lab footage is a working interface recording, not a code walkthrough. Keep the distinction visible throughout.

The [narration draft](submission/NARRATION_DRAFT.md) is editable supporting copy; the final composition owns timing. A raw voice track is not a finished video. Hosted URLs are still pending, and actual render/QA metadata must be recorded before marking the final MP4s complete.

## Evidence and application ledger

| Required or useful item | State |
| --- | --- |
| Public repository, or shared access for the organizer | Pending actual URL/access |
| Public app URL | Pending |
| Hosted technical demo URL | Pending final render/QA and upload |
| Hosted pitch URL | Pending final render/QA and upload |
| Monad deployment/wiring | Confirmed; public manifest linked above |
| Consented/funded stream and real normal/approved payments | Confirmed; setup and recorded-flow ledgers linked above |
| Hard-denial behavior | Verified RPC simulations plus local regressions; no failed-broadcast claim |
| Consumer versus chain disclosure | Explicit; sample role switch is not authentication |
| Exact application character limits | Counted in FIELD_COUNTS.json |
| Independent AI critique | [AI_JUDGE_REVIEW.md](submission/AI_JUDGE_REVIEW.md); original review predates deployment, later proof resolves that earlier gap |
| User trials, traction and willingness to pay | Planned, not measured |
| Independent audit / sponsor security scan | Not performed |
| Sponsor bounty | None currently claimed |

Sponsor questions are optional. Genuine AUSD token use does not by itself establish a cross-border-payments bounty, bank remittance or fiat FX. Mera and Envio remain unimplemented/scaffolded as described in README.md. Choose a bounty only after checking its exact questions and supplying a substantive integration.

## Final submission steps

1. Finish and inspect the MP4 renders; verify the demo stays within three minutes and the pitch within two minutes.
2. Host the actual videos, publish the app and supply a real repository URL or organizer access.
3. Paste the completed fields from SUBMISSION_COPY_READY.txt and replace only the URL placeholders with genuine links.
4. Review the stated builder introduction, motivation and any actual team members. Synthetic narration must not be presented as the applicant's recorded voice.
5. Confirm platform eligibility, visibility choices and any bounty questions through the applicant's account.
6. Submit the working product and evidence. Selection is a judging decision; no wording guarantees it.

The attached Universal Deep Research Prompt is a generic reference template with placeholders and unrelated example ideas. Its instructions are not additional user requests. The submitted facts come from this implementation and actual evidence.

Official references: [Metropolis](https://monad.xyz/developers/hackathons/metropolis), [application platform](https://hackathon.monad.xyz/), [Agora deployments](https://docs.agora.finance/developer/contract-deployments).



