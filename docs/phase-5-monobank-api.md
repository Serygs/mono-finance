# Phase 5: Monobank Personal API client

## Boundary and data flow

`createMonobankClient` constructs a server-only client from the Worker `MONOBANK_TOKEN` secret and D1 binding. The client supports client/account information and statement reads, validates the untrusted JSON response, and maps it into internal source-record DTOs before any future persistence layer sees it. Provider types remain under `worker/monobank/`; no frontend route is introduced in this phase.

Statement DTOs preserve both the account amount and the original operation amount/currency as integer minor units and numeric currency code. The mapper does not overwrite or infer away Monobank transaction identity, timestamps, descriptions, or MCC values.

## Request policy

- Every request has a 10-second timeout.
- Both Personal API functions are documented by Monobank as limited to one call per 60 seconds. A D1-backed gate atomically reserves that window across Worker isolates; statement requests use one conservative global scope because the provider documentation does not promise per-account quotas.
- The client does not immediately retry. Retrying a timed-out or 5xx request inside the same minute could violate the provider limit even though GET is idempotent. Structured errors instead indicate whether a later retry is safe, and rate-limit errors include `retryAfterSeconds`.
- HTTP 401/403 becomes `unauthorized_token`, 429 becomes `rate_limit`, other non-success responses and network failures become `remote_api_error`, invalid JSON/schema becomes `malformed_response`, and an aborted request becomes `timeout`.
- Provider response bodies, account identifiers, tokens, and diagnostic messages are not copied into error messages or logs.

## Local secret

Generate a personal API token at [api.monobank.ua](https://api.monobank.ua/) and add it to the existing ignored `.dev.vars` file beside `wrangler.jsonc`:

```dotenv
MONOBANK_TOKEN=your-real-personal-api-token
```

Keep the existing `SESSION_TOKEN_PEPPER` and `SETUP_TOKEN` entries in the same file. Do not prefix the binding with `VITE_`, place it under Wrangler `vars`, add it to frontend code, or commit `.dev.vars`.

Apply the rate-limit migration before using the client locally:

```sh
npm run db:migrate:local
```

## Production secret

After selecting the intended Cloudflare account and configuring the real production D1 binding, enter the token through Wrangler's interactive prompt so it does not appear in a command argument:

```sh
npx wrangler secret put MONOBANK_TOKEN --env production
```

The secret is non-inheritable and must be configured separately for every deployed environment. `wrangler.jsonc` declares it in `secrets.required`, so local development warns and deployment validation fails when the binding is absent. Rotating the token uses the same command and immediately deploys a new Worker version; use the Wrangler versions-secret workflow when a staged deployment is required.
