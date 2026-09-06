# Architecture

## System boundary

Mono Finance is a private, single-user finance application:

```text
React SPA (src/) -> same-origin /api/* -> Cloudflare Worker (worker/) -> D1
                                                    -> Monobank Personal API
```

The browser must communicate only with same-origin `/api/*` endpoints. D1 access, authentication decisions, secrets, and Monobank requests belong in the Worker. Browser components must not import server clients, bindings, or provider DTOs.

## Repository layout

- `src/features/<feature>/`: feature-owned screens, UI, and hooks.
- `src/components/`: reusable presentational components.
- `src/lib/`: browser infrastructure such as the API client.
- `src/types/`: frontend contract types.
- `worker/routes/`: HTTP mapping and input/output handling only.
- `worker/services/`: use cases and domain orchestration.
- `worker/repositories/`: parameterized D1 data access.
- `worker/monobank/`: provider client and provider DTO mapping.
- `worker/auth/`: authentication and session boundary.
- `worker/analytics/`: aggregate/query logic.
- `worker/common/`: shared Worker infrastructure and response helpers.
- `migrations/`: ordered, reviewable D1 migrations.

## API and configuration rules

Return either `{ data: T }` or `{ error: { code, message } }`. Map known validation, authentication, authorization, not-found, conflict, and upstream categories consistently. Never return stack traces, SQL details, raw upstream payloads, or secrets.

Cloudflare bindings are typed in Worker code. Use Wrangler secrets for credentials and `vars` only for non-sensitive configuration. Keep development and production configuration explicit. Do not configure a D1 binding with a placeholder database ID; add the real binding and matching local/production configuration together when D1 is provisioned.

## State ownership

D1 is the system of record. IndexedDB may cache data for offline use but cannot authoritatively resolve conflicts, replace D1, or be used as an independent database. Sensitive offline data must be encrypted.
