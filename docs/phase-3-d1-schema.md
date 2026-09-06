# Phase 3: D1 schema and migration foundation

## Scope

This phase introduces the initial D1 schema and Wrangler migration commands. It does not add a real D1 binding, authentication endpoints, Monobank requests, synchronization, repositories, or analytics endpoints.

## Schema decisions

- IDs are stable application-generated text IDs; Worker services will generate them with `crypto.randomUUID()`.
- `users.is_application_owner` is unique and constrained to `1`, enforcing the one-user product model at the database layer.
- Sessions retain only a token hash, never a plaintext session token.
- Imported transactions use a globally unique `monobank_transaction_id`. Their provider source fields are immutable through `prevent_imported_transaction_source_update`.
- `account_cards` represents cards separately from Monobank accounts; a transaction can reference both its account and, when known, its card.
- Adjustments, exclusions, category overrides, and compensation links are separate records. A transaction may have one current adjustment, exclusion state, and category override; an expense may have multiple compensation links.
- The `transactions` indexes cover date, account, direction, category, and Monobank transaction ID queries.
- Exchange rates use an integer numerator and denominator plus source and timestamp, which makes converted values reproducible without floating-point persistence.

## Local verification

Use a disposable local D1 database name. The first command creates the schema and the second confirms that migration application is idempotent.

```sh
npm run db:migrate:local
npm run db:migrate:local
```

The migration contract test verifies the tables, indexes, integer-money columns, duplicate-import constraint, and immutability trigger:

```sh
npm test -- migrations/0001_initial_schema.test.ts
```

Remote D1 provisioning and the corresponding `d1_databases` entries remain intentionally deferred until real development and production database IDs are available.
