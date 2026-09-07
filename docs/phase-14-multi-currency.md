# Phase 14: multi-currency and base-currency analytics

Imported transaction amounts and their original currencies remain immutable. The default dashboard view continues to show separate original-currency groups. A user can choose **Base currency** in Settings (default `UAH`) and choose the base-currency view on the dashboard.

## Historical-rate contract

`POST /api/exchange-rates/sync` retrieves Monobank's public currency feed on the Worker only and stores each rate in `exchange_rates` as an integer numerator/denominator with its provider timestamp and source (`monobank-public-mid-v1`). The source is isolated in `worker/exchange-rates/monobank-exchange-rate-source.ts`; a future historical-rate provider can implement the same `ExchangeRateSource` interface.

The public feed is a current feed, not a historical backfill. Base analytics selects only a stored rate whose `rate_at` is at or before the transaction timestamp. It can compose a cross-rate through UAH from two stored rates. A transaction without such a rate is omitted from the base-currency aggregate and reported by original currency; it is never converted using a newer rate.

For a direct Monobank pair, `rateCross` is stored where supplied. If it is absent, the exact rational midpoint of `rateBuy` and `rateSell` is stored, and the source identifier makes that policy explicit. No monetary amount or persisted rate uses floating-point arithmetic.

## API

- `GET /api/preferences/currency` returns the authenticated user's `baseCurrencyCode`.
- `PUT /api/preferences/currency` accepts `{ "baseCurrencyCode": "UAH" }`.
- `POST /api/exchange-rates/sync` stores the latest public rate snapshot.
- Existing analytics endpoints accept optional `baseCurrency=UAH`. Their responses include `currencyConversion`, identifying `original` or `base` mode and any transaction counts omitted because a historical rate is unavailable.

All routes are private and return the standard `{ data }` / `{ error }` response envelope. The public rate feed does not use or expose the personal Monobank token.

## Local use

Run the migration, sign in, then use **Settings → Base currency → Update exchange rates**. The dashboard's base view becomes useful for transactions whose timestamps have matching stored historical-rate records. Existing historical imports will deliberately remain in the original-currency view until a compatible historical-rate source is introduced.
