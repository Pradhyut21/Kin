# Kin contracts: local checks and Monad testnet deployment

Status update — 13 October 2026: the three core contracts were deployed and wired on Monad Testnet on 12 October. The [public manifest](deployments/monad-testnet.json) records the confirmed deployment/wiring receipts; [recorded payment/request/approval evidence](../submission/TESTNET_VIDEO_RECEIPT_EVIDENCE.json) documents real test-AUSD execution. The recorded stream uses disposable project test roles. Explorer source verification, production authentication and an independent audit are not claimed.

Requires Node 22.18 or later and npm. This npm workflow does not require Foundry. The examples use npm.cmd on Windows.

```powershell
cd contracts
npm.cmd install
npm.cmd test
npm.cmd run readiness
```

`npm.cmd test` compiles the contracts and exercises them on a local in-process EVM. `readiness` is read only and reports disabled until real vault/policy/queue addresses are configured.

## Plan first

```powershell
npm.cmd run deploy:plan
```

The plan compiles source, checks Monad testnet chain 10143, and reads the official Agora testnet AUSD code/metadata. It does not create a signer, use a private key or submit a transaction. It saves a public plan under `deployments/monad-testnet.plan.json`.

For an offline compile-only plan:

```powershell
npm.cmd run deploy:plan -- --offline
```

That mode explicitly reports that the network is unverified.

## User-triggered broadcast

The initial 5 October build stopped at an offline plan; the later authorized 12 October run completed the npm deployment and recorded public receipts. To create your own separate deployment, copy `.env.example` to `.env`, supply a funded testnet-only `PRIVATE_KEY` locally, and choose a different `KIN_DEPLOYMENT_NAME`. The saved `monad-testnet.json` belongs to the existing deployment; the script refuses automatic replacement. Keep your key private: plan mode does not need it, and saved public evidence never contains it.

```powershell
npm.cmd run deploy:testnet -- --broadcast
```

Running `npm.cmd run deploy:testnet` without `--broadcast` also produces a read-only plan. Broadcast fixes chain ID 10143 and the official Agora testnet AUSD token address. It deploys the vault, queue and policy, completes their one-time wiring, waits for actual receipts, and reads the dependencies back. It excludes the raw-P256 wallet prototype and creates no user stream or deposit.

Public addresses and each transaction hash/receipt status are saved incrementally in `deployments/monad-testnet.json`. Failure preserves prior addresses and pending hashes. The script refuses automatic redeployment if that record already exists.

```powershell
npm.cmd run deploy:testnet -- --broadcast --resume
```

Resume requires unchanged source files and the same deployer, validates saved code/dependencies and continues incomplete wiring. A pending/unavailable/reverted transaction stops automatic continuation so it can be inspected first. Manual wiring, if needed, calls the deployer-only `setPolicyModule(policyAddress)` on queue and vault; these setters work once. To deliberately plan a separate deployment, choose a different `KIN_DEPLOYMENT_NAME` containing only letters, digits, hyphens or underscores.

## Connect the browser lab

Copy the saved public addresses into `frontend/.env.local` using `frontend/.env.example`, then restart Vite. Never put a private key into `VITE_*` values.

The receiving student must first call `vault.authorizeParent(parentWallet)` from their wallet. The parent can then approve AUSD, create the consented stream, set policy and register merchant categories. Consent is bound to that parent and consumed on creation; `authorizeParent(address(0))` revokes unused consent. This prevents third parties from squatting another student's permanent stream slot.

The lab uses an explicitly accelerated testing rate, separate balances, actual policy decisions and receipts. It has no fiat on-ramp, bank payout, bridge or reviewed passkey wallet integration. See `../SECURITY.md` before considering real funds.

Official sources: [Monad network facts](https://docs.monad.xyz/ai/current-facts) and [Agora token deployments](https://docs.agora.finance/developer/contract-deployments).
