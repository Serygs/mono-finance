# Phase 3 API contracts

All routes remain authenticated, same-origin and use existing success/error envelopes. No provider credentials or technical account IDs are added to ordinary labels.

## Account freshness

`GET /api/accounts` and successful `POST /api/sync/accounts` return `accounts[].balanceUpdatedAt: number | null` (UTC epoch seconds). This is when a validated provider snapshot containing that account was persisted successfully. A returned account with an updated balance receives the timestamp in the same D1 batch. Unavailable accounts keep their previous balance timestamp. Existing rows start at null; `updated_at` cannot prove a successful balance refresh. The browser tolerates absent fields in older responses/cache and displays unknown.

A timestamp is an observation, not account availability, history coverage, or a scheduled refresh guarantee. This iteration introduces no arbitrary stale-after threshold.

## Transaction import coverage

`GET /api/sync/transactions/status` retains all existing fields and adds `syncStates[].coverageIntervals: Array<{ fromEpochSeconds: number; toEpochSeconds: number; completedAt: number }>`.

Each entry records a validated statement request whose returned transactions were successfully persisted (including successful empty responses and duplicate-only imports). Bounds are inclusive UTC epoch seconds; `completedAt` is the successful completion observation. Interval evidence and sync-state completion are committed atomically with a D1 batch. Earlier transaction inserts remain idempotent if completion fails and the window is retried. No-op calls and failed reads/imports establish no interval and cannot advance `lastSuccessfulSyncAt`.

An empty/absent/null interval array means no verified coverage is available. Only the union of successful intervals proves the requested range; disjoint min/max must not fill gaps. The frontend evaluates the elapsed portion through `min(dateTo, now)` without changing the selected filter range. It labels overlapping-but-incomplete elapsed coverage as unverified gaps and non-overlapping/absent evidence as unknown. Entirely future selections are labeled separately and do not create gap warnings. Coverage is assessed separately for each selected account. Future bounds are not implicitly covered. These observations do not prove provider history will never change.

`lastSuccessfulSyncAt` remains a successful transaction synchronization timestamp. Legacy values may include old no-ops; its UI label says “transaction sync succeeded”, not “balance updated” or “complete history”. Verified import times are the interval `completedAt` values. Failed/running status and the previous successful timestamp are both available in details.

Migration `0008_verified_data_freshness.sql` is additive and creates no fictitious legacy evidence. Interval normalization/compaction, bounded backfill scheduling and webhook ingestion are reserved for phase 4.

## Exact category drill-down

`GET /api/transactions` retains the existing exact-name `category` filter for compatibility and adds mutually exclusive criteria:

- `categoryId=<effective category ID>`: parameterized equality against override → mapping → original source identity.
- `uncategorized=true`: no effective category identity (`IS NULL`).

A request combining `category`, `categoryId` or `uncategorized=true`, or repeating a scalar criterion, is rejected using `validation_error`. Category IDs never come from display labels or substring search. Drill-down URLs may carry a `categoryLabel` presentation hint for empty results; current verified row/category names take precedence, the hint is never forwarded to the API, and removing/resetting the category clears it. Criteria apply in the repository before deterministic timestamp/ID cursor pagination. Owner/date/account/currency/direction/exclusion/search criteria remain in every cursor request.

The typed frontend adapter supports current effective original-currency cash-flow aggregates only. Net opens both directions; average/day opens its expense contributors and explains the divisor. A base-currency aggregate has no purported exact ledger link; the interface explains the limitation. No new conversion or compensation formula is introduced.

History-entry snapshots preserve analytics filters and scroll; transaction criteria use URL parameters and cached cursor pages survive a return to the same context. Theme/language changes affect presentation only.
