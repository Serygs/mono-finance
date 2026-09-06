# Monobank domain boundary

## Provider data is a source record

Import Monobank responses into internal DTOs before persistence. Keep provider-specific response types and client logic inside `worker/monobank/`; do not expose provider response shapes to the browser or to unrelated domain layers.

An imported transaction preserves these provider facts permanently:

- original amount;
- original currency;
- original description;
- original MCC;
- original timestamp;
- original Monobank transaction ID.

The Monobank transaction ID is retained and constrained to prevent duplicate imports. Synchronization must be idempotent and must not delete historical transactions merely because a later account response changes.

## Categories

Preserve the original Monobank/MCC-derived category. Effective categorization may additionally use a custom category or a per-transaction override. Keep the model extensible for future automatic categorization rules without treating an automated result as a replacement for the provider category.

## Integration safety

The Monobank token exists only as a Worker secret binding. Never send it to the frontend, commit it, or include it in logs, test fixtures, responses, or client-side configuration. Validate provider responses at the integration boundary and map provider failures to safe internal error categories.
