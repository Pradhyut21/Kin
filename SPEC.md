# Kin product specification — revised 5 October 2026

## Product promise

Money with guardrails for families living apart. The student understands what is available, proposes a payment, reviews the result, and asks a parent when a soft approval threshold is crossed.

The first-five-minutes story is a small grocery payment, a larger purchase requiring approval, and a blocked destination being rejected. Streaming supports that story; it is not the only product feature.

## Deliverables

1. An offline-capable, responsive consumer demonstration with one persisted household state.
2. A Solidity escrow/policy/approval foundation with regression evidence.
3. A separate Monad testnet lab using actual deployed contracts and wallet-confirmed transactions.
4. An honest optional read-only provider/AI gateway and indexer scaffold.
5. A reproducible submission packet.

## Modes and trust boundaries

**Demo:** Sample dollars and preconfigured people/merchants. All amounts are represented as integer minor units. Any currency equivalents are illustrative, fixed estimates. Role switching is visible and local; it does not authenticate anyone. All receipts are sample receipts.

**Testnet lab:** Uses an injected wallet, chain 10143 and configured vault/policy/queue addresses. The app verifies network, deployed code, supported token and dependency links before enabling transactions. Chain roles come from the actual stream. Signatures are requested only after a user action. Success requires a confirmed transaction receipt. No fixed execution-speed or fee claims.

**Backend:** Language outputs are proposals. The backend cannot sign, execute a payment, change a policy or prove settlement. Missing/unimplemented services report unavailable.

## Core invariants

- Available allowance never exceeds remaining escrow.
- Accrual moves value from locked to available; it does not create money.
- Partial spending, pause and rate edits retain earned entitlement.
- Funding does not accrue for earlier unfunded time.
- A student cannot edit the funding parent's policy.
- The student explicitly authorizes the next funding parent; consent is consumed once by stream creation.
- A parent resolves only their own stream's requests.
- Registered recipient category is authoritative.
- Trust/allowlisting bypasses only the approval threshold.
- Active-state, blocklist, hard caps and earned balance remain binding after approval.
- A pending payment does not debit the balance; resolution rechecks current conditions.
- Requests resolve once and expire at the exact 48-hour boundary.
- No user memo or language output silently changes a rule.
- Failed service calls, rejected signatures and reverted transactions never show paid.

## Review interaction

The user selects or describes a known recipient and amount. Kin creates a proposal, displays the selected recipient/category/amount and an evaluation reason. The user explicitly confirms. A failed validation leaves funds unchanged. In the demo it creates a labeled local receipt; in the lab an actual receipt confirms the chain transaction.

Hard-cap violations are denied, rather than presented as parent-overridable exceptions. Parent approval handles only the approval threshold.

## Scope boundaries

No real bank payout, automatic FX conversion, UPI acceptance, production passkey account, gas sponsorship, push notifications, autonomous signing, cross-chain transfer, private onchain memos, DeFi yield or verified merchant identity is delivered.

The prototype has no cancellation/refund/recovery path. Parent policy changes and pause can restrict spending. The local consumer demo uses Monday 00:00 UTC category budget resets. Contracts use fixed category periods and a seven-day window anchored by execution; see SECURITY.md. These timing semantics are deliberately labeled separately, rather than claimed identical. Neither uses rolling windows. Solidity and local demo are separate implementations; each has its own regression tests.

## Acceptance

- Start without API keys and complete the guided consumer flow.
- Verify home, approvals and activity show consistent state and amounts after reload.
- Show the normal payment, parent exception and hard denial.
- Confirm only parent perspective offers local policy/approval actions.
- Test invalid values, expiry, replay, stale proposals and changed policy/balance.
- Build both TypeScript packages and compile/run local-EVM contract regressions.
- Verify testnet disabled states and rejected wallet operations without false success.
- Before submission, complete a genuine two-wallet Monad testnet flow and save explorer evidence.



