# Phase 9: transaction corrections and exclusions

Imported Monobank transaction fields remain immutable. This phase stores user
decisions in `transaction_adjustments` and `transaction_exclusions`; it does
not add a migration because both audit-capable tables were established in the
initial D1 schema.

## Private endpoints

- `PUT /api/transactions/:transactionId/adjustment` accepts
  `{ "adjustedAmountMinor": -100000, "note": "optional" }`.
- `DELETE /api/transactions/:transactionId/adjustment` removes the separate
  adjustment and returns to the imported amount.
- `PUT /api/transactions/:transactionId/exclusion` accepts an optional
  `{ "reason": "optional" }` and removes the transaction from normal
  analytics.
- `DELETE /api/transactions/:transactionId/exclusion` restores it to normal
  analytics.

All endpoints require the existing authenticated, same-origin session and
return the shared `{ data }` or `{ error }` envelope with `Cache-Control:
no-store`. A transaction can be changed only by its owner.

Amounts are signed integer minor units. The service resolves analytics values
as `adjustedAmountMinor ?? originalAmountMinor`, and normal analytics excludes
records with an active exclusion. An adjustment cannot reverse a transaction's
income/expense direction. Audit timestamps are maintained by the separate D1
records; source amount, currency, description, MCC, timestamp, and Monobank
transaction ID are never updated.

The Transactions details sheet provides adjustment, reset, exclude, and
restore controls. It renders the effective value prominently and the original
amount secondarily when an adjustment exists.
