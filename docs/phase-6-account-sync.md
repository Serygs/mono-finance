# Phase 6: account and card synchronization

## Data flow

`POST /api/sync/accounts` requires an authenticated owner session, calls the server-only Monobank client-info endpoint, validates and maps the provider response, and atomically synchronizes the returned `accounts` and `maskedPan` values into D1. It does not fetch statements, jars, managed-client accounts, or transaction history.

The repository uses `monobank_account_id` and `(account_id, masked_pan)` as provider identity constraints while retaining application-generated IDs. Repeating the same snapshot updates metadata and balances without inserting duplicates, and each new account receives one idle `sync_state` row for future statement synchronization. Before applying the latest snapshot, existing accounts and cards are marked inactive; records present in the response are reactivated in the same D1 batch. No account, card, sync state, or transaction is deleted when it disappears from a later response.

Currency values remain provider-supplied ISO 4217 numeric codes at the Monobank boundary. Known currencies, including UAH, USD, EUR, GBP, PLN, CHF, and zero-minor-unit JPY, are resolved to display metadata. An unknown numeric code is stored without rejecting the account or inventing an alphabetic currency code; the UI labels its original integer value explicitly as minor units instead of guessing a decimal exponent.

## API

Both endpoints are private and return `Cache-Control: no-store`:

```text
GET  /api/accounts
POST /api/sync/accounts
```

Successful responses use the same safe contract:

```json
{
  "data": {
    "accounts": [
      {
        "id": "application-account-id",
        "type": "black",
        "balanceMinor": 125050,
        "creditLimitMinor": 50000,
        "isActive": true,
        "currency": {
          "code": "UAH",
          "numericCode": "980",
          "minorUnit": 2,
          "displayName": "Ukrainian Hryvnia"
        },
        "cards": [
          {
            "id": "application-card-id",
            "maskedPan": "537541******1234",
            "isActive": true
          }
        ]
      }
    ]
  }
}
```

Provider account IDs, client IDs, IBANs, send IDs, credentials, and raw upstream errors are omitted. A provider rate limit returns `429 sync_rate_limited` with a safe `Retry-After`; timeouts return `504 sync_timeout`; other provider failures return `502 sync_unavailable`.

## Frontend filter

The overview loads accounts from D1 and offers an explicit “All accounts” choice plus individual account tiles. Selecting one tile switches from all accounts to that account; selecting additional tiles creates a multi-account filter. The preference key `mono-finance:account-filter:v1` stores only the filter mode and internal account IDs in `localStorage`. D1 remains authoritative and no account balances or provider identifiers are cached there.

## Local verification

Configure `MONOBANK_TOKEN` as described in [Phase 5](phase-5-monobank-api.md), apply the existing migrations, start development, sign in, and use **Sync accounts**:

```sh
npm run db:migrate:local
npm run dev
```

The client-info endpoint is limited by Monobank to one request per 60 seconds. `GET /api/accounts` reads D1 and does not consume that provider request window.
