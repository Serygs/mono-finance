# Phase 7: transaction history and ongoing synchronization

## Execution model

`POST /api/sync/transactions` and the Worker cron trigger both perform exactly one statement request per execution. Monobank permits statement periods of at most 31 days + 1 hour and limits this endpoint to one request per 60 seconds, so one bounded request avoids burst rate-limit failures. The cron runs every five minutes and selects the least recently attempted active account.

The first import for an account starts at a documented default of 365 days before the first execution. Each successful run stores `backfill_cursor_at` in `sync_state` and moves backwards by a provider-valid window. Once the cursor reaches the starting boundary, later runs use the latest imported timestamp with a one-day overlap. Transaction uniqueness makes the overlap and any resumed window safe.

`sync_state` also records attempts, successful completion, safe failure category, and a short lease. A process failure or Worker interruption leaves the cursor unchanged; a later execution can safely replay that window. The lease prevents a cron run and manual request from importing the same account concurrently.

## D1 persistence

`D1TransactionSyncRepository` inserts mapped internal transaction records with `ON CONFLICT(monobank_transaction_id) DO NOTHING`. It never updates the imported source fields guarded by the schema trigger. The account's persisted currency is used for `original_amount_minor`, while the preserved Monobank ID, description, MCC, direction, and timestamp are written as immutable source fields.

## API and dashboard

Both endpoints require the owner session and use `Cache-Control: no-store`:

```text
POST /api/sync/transactions
GET  /api/sync/transactions/status
```

The POST response reports only safe internal progress counts and a bounded epoch-second window. `GET /api/sync/transactions/status` reads D1 only and returns per-account status, last successful time, and safe error category. The dashboard never calls Monobank directly; its refresh button starts one Worker sync step and then reloads that D1 status.

Provider rate limits map to `429 sync_rate_limited` with `Retry-After`; timeouts map to `504 sync_timeout`; all other provider failures map to `502 sync_unavailable`. Provider diagnostics, tokens, payloads, and account identifiers are neither returned nor logged.

## Local verification

Apply the new migration, synchronize accounts first, then sign in and select **Refresh transactions**. Repeated clicks may correctly return a rate-limit response until the provider window has elapsed.

```sh
npm run db:migrate:local
npm run dev
```

The scheduled trigger is deployed with `*/5 * * * *` in `wrangler.jsonc`; it uses the same server-only secret binding and D1 state as manual sync.
