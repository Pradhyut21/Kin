# Kin decision brief — researched 5 October 2026

## Recommendation

Keep Kin's existing family-allowance foundation and sharpen it around **money with guardrails**. Build a complete, explainable payment/exception/denial loop instead of adding unrelated sponsor logos.

This is a differentiation hypothesis. Streaming, shared wallets and spending limits already exist. There is no evidence that Kin is the first such product, that it is unbeatable, or that it will be selected.

## Alternatives considered

| Direction | Strength | Cost / weakness | Decision |
| --- | --- | --- | --- |
| Generic shared family wallet | Immediately understandable | Weak distinction; another same-track family-wallet project is public | Insufficient alone |
| Protected claimable remittance | Clear claim/refund story | Would replace much of existing contracts; fiat payout still unsolved | Useful later direction |
| Explainable streamed allowance with hard rules and soft exceptions | Reuses existing code; demonstrates both consumer value and independent enforcement | Needs real signer evidence and careful limits on AI claims | Chosen |

## Prior art

| Source | What exists | Implication for Kin |
| --- | --- | --- |
| [Sablier Flow](https://blog.sablier.com/introducing-sablier-flow) | Open-ended token streams with top-ups, pauses and debt accounting | Per-second streaming alone is not differentiation; Kin's prepaid allowance has different accounting semantics |
| [Safe spending limits](https://help.safe.global/articles/3961440620-set-up-and-use-spending-limits) | Beneficiary token allowances and recurring limits without every owner approving | Do not claim spending policies or allowances as an invention |
| [Safe modules](https://docs.safe.global/advanced/smart-account-modules) | Extensible account restrictions and automation | Policies need rigorous authorization; modules are security-critical |
| [Settle's own repository](https://github.com/Savitura/settle) | A public family-wallet/remittance project | A family-wallet label alone does not distinguish this submission |

Kin's proposed distinction is the consumer explanation and family conversation layered over recipient-bound categories, preserved earned balances, and revalidated parent exceptions. Validate whether families actually value those controls. Do not equate merchant category registration with verified merchant identity.

## Verified event facts

The official [Metropolis page](https://monad.xyz/developers/hackathons/metropolis) lists a 1 September–13 October build period, 14–27 October judging and 3 November winners. Track 02 prizes are $30,000 split across three teams; the grand champion prize is $25,000. Existing projects are allowed when submitted work is new during the event window. Submission includes a working product, project profile, demo, write-up and code link; public source is encouraged.

Relevant listed bounties include Agora cross-border payments, Mera-powered UX, Mera multiple keys and Envio. Their public names and values do not establish detailed qualification. Country eligibility, cutoff time/timezone, native-mobile versus PWA requirements and exact sponsor criteria remain to be checked on the authenticated [application platform](https://hackathon.monad.xyz/).

## Integration feasibility

| Integration | Verified reference | Actual build status / next proof |
| --- | --- | --- |
| Monad testnet | [Official current network facts](https://docs.monad.xyz/ai/current-facts) | Target chain 10143; lab code requires real deployed contracts and receipts |
| Agora AUSD | [Official deployments](https://docs.agora.finance/developer/contract-deployments) | Testnet token 0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC; lab verifies token and decimals |
| Mera | [Repository](https://github.com/category-labs/mera), [authenticator support](https://mera.category.xyz/authenticator-support/), [security model](https://mera.category.xyz/concepts/security-model/) | Not integrated. Preview PRF-based account derivation differs from raw P256/WebAuthn scaffolding; provider compatibility and key lifecycle need real testing |
| Envio | [Monad support](https://envio.dev/chains/monad) | Config/handlers only; needs matching deployment addresses, codegen and a running indexed feature |
| Language model | Provider-gated optional backend | Proposals only, no signing or policy authority; no synthetic outputs labeled provider results |
| Fiat/FX/risk providers | Original docs contain conceptual claims | No production rail, verified merchant, CRE workflow or live FX claim is made |

No sponsor prize should be represented as earned or qualified before its exact requirements and implementation evidence are confirmed. Infrastructure awards can be credits/services; prize-pool headlines are not all cash.

## Research boundaries

No defensible total addressable market, revenue forecast, GitHub-star ranking, academic novelty claim or measured user-conversion rate was established. This is a product/engineering prototype, not a new cryptographic research contribution. Public project descriptions are claims made by their authors.

## Validation that matters now

1. Complete the two-wallet testnet flow and publish honest explorer receipts.
2. Run five first-time user trials. Record time to first reviewed payment, misunderstood copy and approval confusion.
3. Ask both family members whether restrictions help or create conflict; keep earned-money locking visible.
4. Measure actual confirmation latency and gas on testnet; never copy marketing constants into the demo.
5. Make Envio or Mera a bounty target only after a substantive working integration exists.
6. Record the three-minute payment/exception/denial story and document exactly what is local, testnet and pending.

