# Indexer scaffold

This Envio v3 configuration is disabled (`skip: true`) and contains empty address lists. It is not a deployment or a running sponsor integration. The contract signatures match `contracts/src`; replay starts from stream creation so checkpoint accounting is reproducible.

After deploying the contracts, set each single contract address to the corresponding real deployment, choose a start block at or before `StreamCreated`, provide the correct chain/RPC as necessary, and remove `skip: true`. Then install dependencies, run `npm run validate`, and run `npm run codegen` followed by `npm run dev` on a supported platform. Envio 3.12.1 publishes native CLI binaries for Linux/macOS; codegen on this Windows workspace failed with `Cannot read properties of null (reading 'runCli')` because the native addon was absent. Generated handler types remain unverified. Local schema validation and accounting tests run on Windows. Indexing requires an actual chain source and Postgres/Hasura; no public deployment or live credentials are supplied here.

Compatible dependency overrides update Envio's pinned Express, query parser, WebSocket, and build dependencies to remove reported advisories. Generated handlers still require codegen and integration testing on the supported platform before a live deployment.

The backend reads snapshots from the configured GraphQL URL filtered by student and vault. Atomic token amounts stay decimal strings. A snapshot is not a verified current block balance; the `/live` endpoint returns entitlement at the last indexed event and does not invent wall-clock accrual or fiat rates. Requests recorded as pending may already have expired: compare `expiresAt` with the chain timestamp before showing them as actionable.

Run `npm test` to verify accounting around pauses, withdrawals, rate changes, and exhausted deposits. See the official [configuration](https://docs.envio.dev/docs/HyperIndex/configuration-file) and [event handler](https://docs.envio.dev/docs/HyperIndex/event-handlers) references. Live deployment must also enforce access controls on GraphQL; public contract events are not private family records.
