# Analytics rules

## Authoritative inputs

Analytics reads from D1, not directly from Monobank or an IndexedDB cache. It uses transaction data resolved through the domain rules rather than raw provider values alone.

For normal analytics:

- use `effectiveAmount = adjustedAmount ?? originalAmount`;
- exclude transactions marked excluded by default;
- resolve the effective category from an override when present, otherwise the preserved original category;
- respect requested account and date filters;
- keep currency treatment explicit.

Do not fetch or send a full raw transaction dataset when a typed aggregate is sufficient.

## Compensation and reporting

Compensation links are relationships, not transaction rewrites. Reporting that presents personal expense, compensated totals, or remaining uncompensated amount must compute and label those values explicitly. Preserve original and adjusted views so totals are traceable.

## Multi-currency reproducibility

Base-currency analytics must use stored conversion metadata: source currency, target currency, rate, and rate date/source. Never use a current rate to silently recalculate historical values. If a valid conversion is unavailable, make the limitation explicit rather than mixing incompatible currency totals.
