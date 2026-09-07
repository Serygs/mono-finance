# Phase 11: compensation links

Compensations are separate `compensation_links` records; imported Monobank transactions are never updated. An expense may link to multiple same-currency incoming transactions, including partial amounts. D1 triggers and the Worker service prevent invalid directions, duplicate links, cross-currency links, and over-allocation.

All endpoints require the existing authenticated session:

- `GET /api/transactions/:transactionId/compensations` returns links, immutable-source summary values, and deterministic candidates.
- `POST /api/transactions/:transactionId/compensations` accepts `{ "compensationTransactionId": "…", "compensatedAmountMinor": 1000 }`.
- `DELETE /api/transactions/:transactionId/compensations/:linkId` removes only the relationship.

Suggestions are deterministic and local to D1: same-currency incoming records are ranked by amount fit, time proximity, shared description terms, and whether available amounts can exactly cover the remaining expense. They are suggestions only; every link requires explicit confirmation.
