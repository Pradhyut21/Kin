# Kin contract security review

Status: hardened prototype; not an audit or authorization to handle real funds.

Deployment update — 13 October 2026: the core contracts were deployed and wired on Monad Testnet on 12 October. [Public deployment receipts](contracts/deployments/monad-testnet.json) and [recorded payment/request/approval evidence](submission/TESTNET_VIDEO_RECEIPT_EVIDENCE.json) document that later execution. The consumer demo still uses sample credits; the recording used disposable test wallets. This update does not establish an independent audit, production wallet security, merchant acceptance or fiat settlement.

## What this implementation enforces

- A vault accepts exactly one immutable token selected at deployment. Deposits and payments require exact balance changes; fee-on-transfer tokens are rejected. The deployment token must be independently verified on the chosen network.
- A stream stores earned entitlement separately from its remaining escrow. Partial payments deduct only the payment. Pausing, resuming and changing the rate preserve already earned funds. Funding checkpoints first, so a new deposit cannot accrue retroactively during earlier exhausted time.
- Accrual saturates at the remaining escrow before multiplication, including extreme rates. Earned funds cannot exceed the recorded deposit.
- Creation requires the receiving student to call authorizeParent(parent) first. Consent is bound to that parent, consumed atomically on creation, and can be revoked before use with address zero. Unauthorized dust deposits cannot reserve another student’s permanent stream slot. The funding parent controls their stream's rules, recipient/category registrations, blocklist, trusted recipients and pause/resume. The receiving student is the only caller allowed to submit a spend.
- Recipient addresses are bound by the parent to categories. A student or an AI classifier cannot select an unrelated category to avoid its cap. Unknown recipients require registration; remapping a pending request's recipient invalidates that request until its original binding is restored.
- All executions recheck active policy, active stream, recipient registration, category integrity, blocklist, transaction cap, category cap, weekly cap and available earned funds. A trusted recipient skips only the approval threshold. Approval never overrides a hard protection.
- Approval requests retain the actual stream student, funding parent, recipient, amount, category and memo. Only that parent can approve or decline. No `tx.origin` is used.
- A request is single use and expires at `block.timestamp >= expiresAt`. Direct transactions use the chain's normal sender authentication and transaction replay protection; there is no invented block-number nonce. There is no delegated/offchain approval-signature path.
- Approvals recheck current protections at execution time. A failing callback rolls the request status back, preserving the parent's ability to decline it. Queued funds are not reserved; another spend can make approval fail.
- Vault token transfers, policy execution and queue creation/resolution use reentrancy guards. State writes and budget accounting happen before outgoing transfers, and failures roll back the full transaction.
- Category cap edits preserve spending already counted in the current configured window. Weekly usage continues being tracked while its limit is disabled. Limits use fixed windows, not a rolling seven-day calculation.

## Deployment and authority

`StreamVault` is constructed with the supported token, then `ApprovalQueue` with the vault, then `PolicyModule` with both. The deployer completes one-time `setPolicyModule` wiring on the queue and vault. The module must reference those exact dependencies. These addresses cannot subsequently be changed, and the contracts are not upgradeable.

`contracts/scripts/deploy-testnet.mjs` provides an offline compilation plan plus an explicit user-triggered npm broadcast/resume path without Foundry. Plan mode never creates a signer or uses a private key; broadcast requires --broadcast and a locally supplied key. It pins chain 10143/official Agora testnet AUSD and saves addresses/receipts incrementally, retaining partial evidence on failure. Existing deployment records require explicit resume and matching source hash, deployer, token and chain. The initial 5 October work stopped at an offline plan. The later authorized 12 October run used this npm script to deploy and wire the three core contracts, then completed consented test-AUSD payments and approvals. Its actual public receipts are linked above. The alternative `contracts/script/Deploy.s.sol` compiles and follows the same order, but Foundry execution was not performed. Explorer source verification and sponsor qualification are not claimed.

ABI changes from the original scaffold:

- `StreamVault.authorizeParent(address)` and `authorizedParent(address)` provide explicit one-use student consent; `createStream` requires it.
- `StreamVault(address supportedToken)` replaces the placeholder-module constructor. `getStream(uint256)` returns a struct; the stream also stores `accruedBalance`.
- `ApprovalQueue(address vault)` plus one-time module setup replaces the unresolved circular dependency. `createRequest` now carries `bytes32 category`; `approve(requestId)` and `decline(requestId)` remove the ineffective nonce argument. `getRequest` returns the complete record.
- `PolicyModule.setRecipientCategory` registers recipients. `setPolicyActive` pauses rules. `denialReason` provides deterministic machine-readable failure reasons.
- `KinAccount` uses constructor-bound EntryPoint/public keys and has no initializer, factory or upgrade path. It is excluded from deployment.

## Validation actually performed

From `contracts/`, run `npm test`. The local runner compiles all seven Solidity source, test and deployment files with pinned `solc` 0.8.24, emits ABI/bytecode artifacts, and executes contracts on an in-process Ganache EVM. It does not contact a chain or use live funds.

The verification run passed **32 regression groups**, including **50 deterministic accrual/property cases**. Coverage includes:

- permissionless dust squatting, wrong-parent consent, one-use consent/replay and student revocation;
- partial withdrawals; pause/resume; rate edits; funding after exhaustion; funding while paused;
- unauthorized approvals/declines, correct student/category retention, approval replay, decline replay, nonexistent requests and exact expiry;
- approval rechecks after changes to global/category/weekly caps, blocklist, policy state, stream pause, recipient binding and remaining available funds;
- category spoofing, unknown recipients, trusted-recipient cap enforcement, cap edits and usage while limits are disabled;
- unauthorized policy/vault/queue calls and replacement wiring, fee-token rejection with full accounting rollback, invalid amounts/memos/configuration;
- fixed-window expiry, maximum-rate arithmetic and earned balances bounded by escrow.

`contracts/test/KinTest.t.sol` additionally provides a dependency-free Foundry regression/fuzz suite. That suite and the deployment script were compiled by solc, but **Foundry execution was not run because `forge` is not installed**. Its configured 1,000 fuzz runs therefore remain unverified. The test-harness code-size warning is not about the escrow, policy or queue contracts; the local EVM deployed all core contracts under standard size limits.

Ganache used its JavaScript networking fallback because the optional native micro-WebSockets binary does not match the local Node version. The completed verification run succeeded with that fallback.

## Unverified and deliberately limited

- `KinAccount.sol` is an **experimental raw-P256 ERC-4337 v0.6 example, not a WebAuthn/passkey wallet**. It does not parse authenticator/client data or validate an RP ID, origin or WebAuthn challenge. Missing P256 precompile support fails closed. It has no account recovery or reviewed wallet integration, and is excluded from the deployment script. A reviewed wallet provider is needed before real user authentication or funds.
- This contract foundation does not prove that the frontend, backend, AI model, on-ramp, indexer, wallet provider or sponsor APIs are integrated. Sponsor names and mock balances are not security evidence.
- Amounts and limits are token base units. Display currency conversion is not enforced here. No FX oracle, fiat settlement, bridge or local bank payout is implemented in these contracts.
- The supported token is trusted to have stable, standard ERC20 balance semantics. Rebasing, callbacks and malicious tokens require separate review. There are no issuer/peg guarantees; the test token is just a mock.
- Registration makes category policy a parent-controlled address mapping, not verified proof of what goods a merchant sold. A registered merchant or recipient could misuse received money.
- Memos, recipients and family relationships can be publicly exposed by calldata, storage and events. Do not put personal information in memos. Removing a few input characters does not establish resistance to prompt injection; the AI must remain proposal-only and users must confirm parsed intent.
- The prototype has no unearned-deposit refund/cancellation path, guardianship recovery, student rotation, allowlisted token migration, insolvency handling, production pagination or disaster recovery. Each student is permanently associated with their created stream; the parent can fund it again.
- Pending requests are enumerated from growing history. A production service should paginate or index them, define spam limits and monitor failed approvals.
- A complete review must cover supported-chain execution semantics, a chosen issued token, wallet signatures, deployment configuration, economic abuse, privacy, key recovery and adversarial/invariant testing before real funds are accepted.

## Browser transaction protections verified

The separate testnet lab verifies deployed code, the official token and all dependency links before enabling writes. It checks the sender against the onchain parent/student. Every transaction carries chain ID 10143 and uses a fixed-network BrowserProvider. A guarded EIP-1193 transport rechecks account and chain when ethers actually requests signing, including after asynchronous gas estimation.

Receipts are monitored through a fixed public Monad provider, so a later wallet account/network switch cannot change the chain being checked. Confirmed gas repricings are accepted only when the replacement retains the chain, nonce, sender, destination, calldata and value. Cancellations, altered actions and failed receipts never become success. Account/network-switch and replacement failure paths were exercised with mocked-wallet regression tests. A later successful public-network lab flow was recorded through a clearly labeled disposable test-wallet bridge; this does not establish those adversarial checks on production wallet extensions.

Seven focused helper regression groups cover disabled config, exact token parsing, actual hard-revert decoding, speed-up/cancellation handling, stale account/network guards, a chain switch during gas estimation, and ABI compatibility. The deployment path first passed an offline plan, then completed the later authorized Monad Testnet broadcast. Deployed tightened-cap and blocked-recipient failures were checked with discarded `eth_call` simulations; they were not broadcast failed transactions.
