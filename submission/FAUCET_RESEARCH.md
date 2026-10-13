# Read-only faucet research — 12 October 2026

The initial research was read-only: no wallet was created, faucet claim sent, transaction signed, contract deployed or funds moved during that phase. Later authorized project funding and execution are documented in the appendices below.

## Agora test AUSD: documented function and live parameters verified

Agora's [deployment directory](https://docs.agora.finance/developer/contract-deployments) lists the Monad Testnet faucet at `0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C`. Its [official test-token guide](https://docs.agora.finance/instant-settlement/guides/getting-testnet-tokens) documents `requestFunds(address receiver)`, preceded by simulation and followed by a normal wallet transaction. The guide's example is on Sepolia; the Monad address and runtime getters were checked separately.

The ABI came from [Agora's own example repository](https://github.com/agora-finance/stable-swap-examples/blob/main/src/generated/abis.ts), parsed as literals rather than executed. The repository's generated Sepolia address is an older address and was not used for the Monad check. The official deployment directory supplied the Monad address. The parsed ABI is saved in `AGORA_FAUCET_ABI.json`.

Read-only calls on Monad chain **10143**, block **70402048**, returned:

| Getter | Result |
| --- | --- |
| `token()` | `0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC`, official test AUSD |
| `faucetDripAmount()` | 10,000,000,000 token units = **10,000 AUSD** at 6 decimals |
| `maxAmountToOwn()` | 100,000,000,000 token units = **100,000 AUSD** |
| `maxDripFrequency()` | **60** |
| `lastDripTimestamp()` | **1791807465** |
| Block timestamp | **1791809476** |
| Deployed runtime code | **1,200 bytes** |

`requestFunds(address)` simulated successfully using `eth_call` with receiver `0x0000000000000000000000000000000000000001`. Every simulated state change was discarded. No token balance was credited and no transaction hash exists for that simulation. The faucet ABI includes `MaxFrequencyExceeded` and `MaxAllowedExceeded` errors. Its timestamp getter has no address argument, so the configured frequency appears to apply to a shared faucet clock; do not assume a separate unlimited claim allowance per fresh wallet. A real claim must simulate again at the current block and respect the faucet's current restrictions.

The token is free test currency, but a claim is a normal nonpayable contract transaction. The caller therefore still needs test **MON** for gas. A fresh zero-MON wallet cannot execute a signed AUSD claim by itself. Current evidence is saved in `AGORA_FAUCET_READS.json`; `check-agora-faucet-readonly.mjs` repeats only public reads and a discarded simulation.

## Official test MON faucet

Monad's current [network documentation](https://docs.monad.xyz/developer-essentials/testnet) and [current facts](https://docs.monad.xyz/ai/current-facts) identify [faucet.monad.xyz](https://faucet.monad.xyz) as the official faucet. The public page shows an address input and “Get Testnet MON”; social connections are presented as a way to receive more tokens. The older official [onboarding guide](https://monad.xyz/blog/monad-testnet-onboarding-guide) likewise describes entering an address to request test tokens.

The public HTTP GET from this environment returned **429**. No repeated claims, browser identity changes, proxy use, CAPTCHA solving, login, or rate-limit bypass was attempted. The current CAPTCHA/eligibility checks and exact grant interval could not be verified from an interactive session, so this research does not claim that CAPTCHA or OAuth is always required, optional in every case, or automatically passable for a fresh wallet. The normal official UI is the confirmed funding route.

## Documented agent faucet route: plausible, not tested here

A [development guide published by portdeveloper](https://gist.github.com/portdeveloper/b17b8fb3fd3a03a407f2c344de1be6d2) documents `POST https://agents.devnads.com/v1/faucet` with a JSON body containing `chainId: 10143` and a receiving address. The author's [public profile](https://github.com/portdeveloper) identifies them as a Monad developer advocate. The documented example uses no account, signing key or authorization header and describes a test-MON transaction result. This is a primary maintainer-published integration guide, rather than a third-party bot recipe.

That route is absent from the current canonical Monad documentation index inspected here. Public GETs to the service root, `/docs` and `/openapi.json` returned 404; these are not tests of the POST claim endpoint. No POST was sent because that would request an actual token transfer, outside this read-only research. Its current grant amount, eligibility rules, uptime and rate limits remain unverified. Treat it as a documented candidate, not proof that free automatic funding succeeded. If a future authorized normal request fails, use the official UI without bypassing the service's checks.

## Practical result

At completion of the initial read-only phase, the AUSD claim method and token identity were verified and a discarded simulation succeeded. A native MON balance remained the funding prerequisite. That initial phase supplied no deployment or working Kin transaction evidence.

## Later authorized development funding

After the read-only research, a separate instruction authorized fresh project-only test wallets and one normal free test-MON faucet request. Five disposable development roles were persisted immediately in `contracts/.private/test-wallets.json`, after adding `/contracts/.private/` to `.gitignore`. Keys were never printed or sent to the faucet. The workspace presently has no `.git` directory, so the ignore rule protects a future initialized repository; the private directory must stay out of any upload or artifact packaging.

The documented `https://agents.devnads.com/v1/faucet` request succeeded with a body containing only `chainId` and the public parent address. The fresh parent `0xBB67922989dDD55b99d190CD552FCcb9b0aa6bEB` received **1 test MON** in [this confirmed transaction](https://testnet.monadscan.com/tx/0x408d809fef3c0f48562a0108230aab6447453405195e8b9dff0902597fc1be51), status 1 on chain 10143, block 70402861. Public transaction destination and value matched the requested wallet and `1e18` wei. A subsequent public balance read showed 1 MON. Only one request was made; no CAPTCHA, OAuth, rate limit or authentication bypass was involved.

`TESTNET_MON_FUNDING.json` records the response and independently checked receipt; `TESTNET_WALLETS_PUBLIC.json` contains addresses only. `create-testnet-wallets-and-request-mon.mjs` refuses to run again if wallets or prior funding evidence exist. Native development funding is now available. No AUSD claim, contract deployment, approval, stream setup or outgoing transfer was executed, so Kin's onchain product requirement remains unproved.

## Subsequent authorized testnet foundation and real flow

A later continuation authorized the fresh project wallets and free test assets to be used for the actual Monad product demonstration. The core contracts were deployed and wired on chain 10143. The parent made one normal official `requestFunds(parent)` claim for 10,000 test AUSD, and funded a consented 100-AUSD family stream. A one-AUSD payment and a ten-AUSD queued/approved exception were executed and confirmed. Tightened-cap and blocked-recipient denials were checked with discarded `eth_call` simulations; no failed transaction was substituted for a success.

`contracts/deployments/monad-testnet.json` and `REAL_TESTNET_DEMO_EVIDENCE.json` hold the genuine addresses, transaction links and balance snapshots. `CHAIN_EVIDENCE.json` subsequently re-read the public receipts/code/wiring and reports `testnetDemoReady=true`. For the browser recording, the student needed another 0.10 test MON after the original 0.15-MON gas allowance was partly consumed; this came only from the same fresh parent's remaining faucet funds and is recorded in `TESTNET_CAPTURE_GAS_TOPUP.json`. No second agent-faucet request, personal wallet, mainnet asset or fiat transfer was used.
