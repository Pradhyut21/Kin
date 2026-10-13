# Kin current state — 12 October 2026

## Product direction

Kin is money with guardrails for Metropolis's Consumer Products & Payments track. The central interaction is an everyday payment, a requested exception and approval that still respects the current hard rules.

The consumer interface is a sample-credit prototype with local role switching. The separate Monad Testnet lab has genuine deployed contracts and recorded test-token transactions. Sample receipts are not chain receipts.

## Completed and supported by public evidence

- Three core contracts deployed on Monad Testnet, chain 10143, and wired through five confirmed transactions. Public-RPC reads verified code, supported Agora testnet AUSD and dependency links.
- Student consent, a 100 test AUSD stream, configured recipient-bound policies and registered receiving wallets.
- A 17-stage disposable-wallet setup flow: normal 1 test AUSD spend, queued 10 test AUSD request, tightened cap to 8, read-only approval rejection, restored cap to 20, and confirmed 10 test AUSD approval/execution.
- Read-only blocked-recipient rejection against the deployed policy. Both denial proofs are eth_call simulations, not broadcast failed transactions.
- Fresh browser-lab footage showing a real 1 test AUSD payment, a real 10 test AUSD queued request and recorded parent approval/execution. Receipt/log verification confirmed the queued request had no token transfer and request 2 resolved.
- Consumer proof footage with a $249 sample request, hard cap changed to $200, approval rejected without debit, then restored cap and a single successful resolution.
- Paste-ready application fields, exact character counts, proposed adult student/parent pilot strategy and independent AI critique.
- Synthetic voice tracks and captions generated; compositions prepared for a 179-second technical demo and 87-second pitch.

Public sources of evidence:

- `contracts/deployments/monad-testnet.json`: deployment addresses and five successful receipts.
- `submission/REAL_TESTNET_DEMO_EVIDENCE.json`: initial stream and 17-stage setup flow.
- `submission/TESTNET_VIDEO_RECEIPT_EVIDENCE.json`: recorded browser-flow receipts/events and final snapshot.
- `submission/APPLICATION_DRAFT.md`, `submission/SUBMISSION_COPY_READY.txt`, `submission/FIELD_COUNTS.json`: application and limits.
- `submission/AI_JUDGE_REVIEW.md`: independent internal AI critique; original review predates the verified deployment.

At block **70411769**, recorded vault escrow/token balance was **77 test AUSD**, grocery recipients had received 3, technology recipients 20, the blocked wallet 0, and no requests were pending. Later transactions may change these values.

## Recording and authentication boundary

The real browser recording used a visible disposable project TEST wallet bridge to sign clicked testnet actions. No wallet-extension modal, passkey or production user authentication was demonstrated. Private keys remained outside the browser, and the bridge was stopped after capture.

The ordinary injected-wallet lab path is implemented separately. The consumer demo's Priya/Mom switch is not wallet authentication. The accelerated 0.5 test AUSD/second stream is a recording aid, not an allowance recommendation.

## Existing software checks

The 5 October revision recorded 30 frontend tests, 12 API tests, 32 contract regression groups including 50 deterministic accrual cases, 5 indexer accounting tests and 14 browser acceptance checks. Those are dated historical results; this documentation revision did not rerun the full suite.

The executed local contract path used pinned solc/Ganache. Foundry execution was unavailable. No independent security audit has been performed. The raw-P256 account remains excluded.

## Current output status

Media project: `D:/SAANS/deliverables/brag-output-2026-10-11-182558/kin-metropolis-2026-10-12`.

Planned final files: `Kin-Technical-Demo.mp4` (179 seconds) and `Kin-Pitch.mp4` (87 seconds), with corresponding SRT files. Compositions and voice tracks exist; final render and QA are pending. Do not label the final MP4s complete until output metadata and visual/audio QA have passed.

No public repository, app or hosted video URL is available yet. Submission-platform fields remain drafts until those links and the applicant's final review are supplied.

## Honest prototype limits

The parent can change rules and pause the stream after the student consents to the funding relationship. Earned entitlement survives pauses, but there is no unrestricted student withdrawal or refund/recovery path.

The recipient registry binds addresses and categories; it is not verified merchant identity or proof of goods purchased. Retail checkout, fiat payout, FX, a reviewed passkey/Mera wallet and a deployed Envio indexer are unimplemented. Consumer and contract budget-reset semantics differ. Onchain events may expose family relationships and payment metadata.

No user trials, traction, revenue, unique-first claim, sponsor-bounty qualification or selection outcome is asserted. The first market strategy is a proposed opt-in testnet pilot with adult students, funding parents and registered receiving wallets.

## Next steps

1. Finish MP4 rendering and verify duration, footage, captions and voice.
2. Publish the repository/app and host both videos; add the actual URLs to the application fields.
3. Review the pitch introduction and product rationale; confirm any actual teammate introductions if needed.
4. Verify application eligibility and any chosen bounty's exact questions in the applicant's account.
5. Run proposed user trials and address consumer signing, exit/recovery, privacy and production readiness before a real-money release.

README.md and SUBMISSION.md reflect the current deployment/recording evidence. Older architecture/research documents retain their dates; archived conceptual documents are not proof of historical integration claims.

