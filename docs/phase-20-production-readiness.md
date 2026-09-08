# Phase 20: Observability and production readiness

## Operational signals

The Worker emits structured JSON events with a request ID, safe route, HTTP status, and duration. Unexpected API failures also include the HTTP method, exception name, safe error code, sanitized and length-limited message, and the immediate cause when available. D1 failures deliberately omit exception messages because they can contain SQL details. Stack traces, request bodies, cookies, account balances, Monobank tokens, passwords, and database error messages are never added to application logs. Cloudflare Workers Logs and traces are enabled; `OBSERVABILITY` writes aggregate request, authentication-failure, and internal-error metrics to the `mono-finance-observability` Analytics Engine dataset.

The private **System status** screen reads `/api/system/status`. It shows only aggregate state: application versions, D1 probe outcome, persisted account and transaction sync timestamps, Monobank state inferred from the latest persisted sync result, and this browser session's encrypted offline-cache state. It does not contact Monobank and does not contain transaction data.

## Production checklist

1. Start from a clean checkout and run `npm ci`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e`.
2. Confirm GitHub `production` Environment variables contain `CLOUDFLARE_D1_DATABASE_ID` and `PRODUCTION_HEALTH_URL`; keep Cloudflare credentials in Environment secrets.
3. Confirm the Worker has `MONOBANK_TOKEN`, `SESSION_TOKEN_PEPPER`, and `SETUP_TOKEN` as Cloudflare Worker secrets.
4. Run pending migrations once, deploy, then verify `/api/health`, login, `/api/system/status`, a read-only dashboard request, and the installed PWA offline state.
5. In Cloudflare Observability, create saved queries for `event = "api_request_failed"`, `event = "scheduled_transaction_sync_failed"`, and elevated `event = "authentication_failure"`.

## Alerts

Create Cloudflare notification policies in the dashboard for Worker 5xx/error-rate anomalies, D1 daily-limit emails, and an external HTTPS health check for `/api/health`. Alert delivery destinations and account-specific thresholds are intentionally not committed in Wrangler configuration. For a single-user application, start with: any sustained 5xx response for five minutes, any scheduled-sync failure, and any D1 quota notification.

## Recovery and incident notes

- Use the `X-Request-Id` response header to locate the matching `api_request_failed` or `d1_query_failed` event in Workers Logs or `wrangler tail`; inspect `errorName`, `errorCode`, `errorMessage`, and the corresponding `cause*` fields. Do not paste cookies, tokens, or raw request bodies into incident notes.
- For a failed transaction sync, inspect the System status screen and the persisted safe `lastErrorCode`; resolve provider access/rate limiting, then use the normal manual refresh. Duplicate imports remain safe by the Monobank transaction-ID constraint.
- For D1 failures, inspect D1 Metrics and `wrangler d1 insights`; query parameters are not included in Cloudflare D1 insights. Do not retry writes outside the application's idempotent sync path.
- Roll back Worker code through Cloudflare deployments if needed. Do not edit an applied migration; recover schema with a new forward migration.

## Export and backup guidance

D1 is authoritative. Before a destructive recovery, use Cloudflare D1 backups/time travel according to account policy and export only through a trusted authenticated workstation. A data export must be a read-only, parameterized D1 query and be stored encrypted at rest; never export secrets, password hashes, session token hashes, or unredacted operational logs. Verify a backup's restoration procedure periodically in a separate database before relying on it during an incident.
