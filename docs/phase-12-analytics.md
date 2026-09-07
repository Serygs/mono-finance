# Phase 12: analytics query layer

The authenticated Worker exposes aggregate-only D1 read endpoints. All accept repeated `accountId`, `dateFrom`, and `dateTo` (UTC epoch seconds); a range is required and capped at 366 days.

- `GET /api/analytics/overview` returns total expense, income, net cash flow, average daily expense, comparable-period change, compensated versus personal expense, excluded totals, and current-month projection.
- `GET /api/analytics/breakdowns` returns income and expense categories, account and currency distributions, top merchants, and largest transactions.
- `GET /api/analytics/trends` returns daily and monthly income/expense/net series plus the expense trend.

The D1 read model resolves `adjusted_amount_minor ?? original_amount_minor`, active exclusions, category overrides, and compensation links without updating imported transaction fields. Normal aggregates omit excluded records; `excludedTotals` is intentionally separate.

Amounts are signed or absolute integer minor units according to their field name, and every aggregate is grouped by `currencyCode`. The application does **not** combine currencies until a historical exchange-rate source is implemented: an empty or missing rate must never cause a current-rate conversion. The existing `exchange_rates` schema is reserved for that future explicit, reproducible base-currency projection.

Compensation uses the effective expense amount and caps the compensated share at that amount, so `compensatedExpenseAmountMinor + personalExpenseAmountMinor = expenseAmountMinor` even where a separate adjustment exists.
