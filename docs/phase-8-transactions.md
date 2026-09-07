# Phase 8: transaction browsing

The authenticated transaction screen reads only from D1. It never triggers a
Monobank request; use the existing account and transaction sync actions to
import newer bank data first.

## Endpoint

`GET /api/transactions` returns a chronological, cursor-paginated transaction
view in the shared `{ data }` envelope. It is private and sends
`Cache-Control: no-store`.

Supported query parameters:

- repeated `accountId` values (up to 20);
- `dateFrom` and `dateTo` as UTC Unix epoch seconds, inclusive;
- `direction=income|expense`;
- three-letter `currency`;
- exact effective category name via `category`;
- `excluded=true|false`;
- `search` for a case-insensitive literal description match;
- opaque `cursor` returned by the preceding page; and
- `limit` from 1 through 100 (default 50).

Each result retains both the immutable `originalAmountMinor` and its separately
resolved `effectiveAmountMinor`, as well as indicators for adjustments,
compensation links, and exclusions. Amounts are integer minor units and include
the currency minor-unit scale needed for correct browser formatting.

The Transactions screen uses TanStack Query's infinite query cache. It fetches
the first page once per active filter set and requests subsequent pages only
when the user chooses **Load more**. Search input is deferred so rapid typing
does not block rendering.

## Scope

This phase is read-only. Creating adjustments, exclusions, category overrides,
or compensation links remains outside the phase; their existing records are
only surfaced as immutable-aware indicators.
