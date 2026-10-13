# Kin source submission

This archive contains the application source, locked dependencies, local tests, project documentation,
and public evidence of the deployed Kin contracts and recorded transactions on Monad Testnet.
This is a portable source snapshot. The adjacent manifest records its verified publication status
and canonical links; creating the archive itself performs no website, email or video-host upload.

Extract this folder and install Node.js 22.18 or later. From this folder run:

```powershell
npm.cmd run setup
npm.cmd run check
npm.cmd run dev
```

The consumer interface uses labeled sample credits. The separate Monad lab verifies deployed
contracts and real test AUSD. Its public addresses are in PUBLIC_TESTNET_CONFIG.txt. Create
your own ignored frontend/.env.local using that public configuration before starting Vite.
The three .env.example templates were checked to contain only blank credentials and public/local
configuration. Actual .env/.env.local files are excluded. Backend integrations are optional and
unconfigured provider routes remain unavailable rather than returning synthetic settlements.

The recorded demonstration used disposable project test wallets and an explicitly labeled
local test signing bridge. Private keys and that temporary bridge are intentionally excluded.
To transact yourself, connect your own funded disposable Monad Testnet wallet through the lab.
The already-recorded family stream is controlled by its recorded parent/student addresses;
using a different wallet does not grant those roles. Review SECURITY.md and create a new
consented stream with your own test roles rather than depositing real assets.

Public deployment evidence: contracts/deployments/monad-testnet.json.
Core flow evidence: submission/REAL_TESTNET_DEMO_EVIDENCE.json.
Actual recorded receipt/event verification: submission/TESTNET_VIDEO_RECEIPT_EVIDENCE.json.
The latter reports 77 test AUSD remaining and no pending requests at its checked block.
The earlier core-flow snapshot reports 89 test AUSD before later browser-recorded payments.
These are historical block-tagged observations, not promises about a future balance.

No bank payout, currency conversion, retail acceptance, passkey production account,
independent security audit, deployed indexer or sponsor bounty eligibility is claimed.
The raw-P256 account experiment is present in source but excluded from the demonstrated deployment.

Product and video URLs are recorded only after their actual publication is verified.
The ZIP's SHA-256 and validated file list are in the adjacent SOURCE_PACKAGE_MANIFEST.json.
