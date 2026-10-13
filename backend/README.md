# Backend gateway

`npm install`, `npm run build`, and `npm test` build and verify the API. `npm run dev` binds to `127.0.0.1:3001` by default. Copy `.env.example` to `.env` to configure optional integrations; empty values keep them disabled. No external credentials are required for the build or tests.

`GET /health` reports service health. `GET /api/integrations` reports configuration and implementation status without revealing credentials. Configuration is not evidence of a successful provider call. Live integrations are not verified until real credentials and deployed infrastructure have been tested.

Configured outbound routes require a random `API_GATEWAY_TOKEN` of at least 32 characters in `Authorization: Bearer <token>`. Keep that token in a trusted server environment; do not bundle it into frontend/browser code. This is gateway access control, not family or wallet authentication. There is no authenticated family session, signing key, transaction executor, rule-edit endpoint, or private audit store.

- `GET /api/zerion/portfolio/:address` and `/api/zerion/transactions/:address`: documented read-only wallet data. Failed transaction statuses remain failed.
- `GET /api/nansen/risk/:address`: documented Monad address labels. Labels do not verify a recipient or approve a payment; `riskLevel` remains `unknown`.
- `GET /api/stream/:studentAddress` and `/api/stream/:studentAddress/live`: indexed snapshots filtered by the configured vault. Token amounts remain strings in atomic units. The latter returns entitlement at the last indexed event, without inventing current chain balances or fiat exchange rates.
- `POST /api/agent/parse-spend` and `/api/agent/parse-rule`: bounded `{ "message": "...", "streamId": 1 }` input and strict, untrusted review proposals. LLM output cannot produce execution fields or a payment/policy confirmation. Amounts, recipient addresses, current hard policy, and currency conversion still need independent review in the wallet.
- Mercuryo session/status routes return `501 FUNDING_NOT_IMPLEMENTED`. No funding or order completion is simulated. Chainlink FX functions reject because no feed or CRE workflow exists.

Missing configuration returns `503`; upstream failures or invalid outputs return `502`; invalid requests return `400`. No failed integration silently returns a mock balance, verified recipient, updated rule, or completed top-up. CORS accepts only `FRONTEND_ORIGIN`; it does not substitute for authentication.

The offline tests inject provider responses to verify failure boundaries. They do not contact real providers or establish live integration readiness. Protocol references: [Zerion authentication](https://developers.zerion.io/authentication), [Nansen address labels](https://docs.nansen.ai/api/profiler/address-labels), [Kimi API overview](https://platform.kimi.ai/docs/overview), and [Qwen regional base URLs](https://help.aliyun.com/en/model-studio/base-url).
