# D1 migrations

`0001_initial_schema.sql` establishes the financial data model, `0002_authentication.sql` adds durable login-rate-limit state, `0003_monobank_api_rate_limits.sql` coordinates outbound Monobank request windows across Worker isolates, `0004_transaction_sync_state.sql` adds resumable transaction-backfill cursors and short-lived sync leases, `0005_currency_preferences.sql` stores each user's analytics base currency, and `0006_category_source_mappings.sql` maps immutable MCC-derived source categories to user-owned display categories. The migrations are deliberately plain SQL: no ORM is used, and repository code binds all dynamic query values with D1 prepared statements.

## Timestamp and money conventions

- Every timestamp is an `INTEGER` UTC Unix epoch in seconds.
- Every monetary value is a signed `INTEGER` in currency minor units.
- Imported Monobank transaction source fields are protected by a database trigger. `categories` and `transaction_category_overrides` model effective custom classification separately; the original MCC-derived category is never changed.
- Exchange rates are rational values (`rate_numerator / rate_denominator`) with their source and timestamp, rather than floats.

## Workflow

Create a real remote database once for each environment. Do not copy the returned ID into the repository. For production, save it as the protected GitHub `production` environment variable `CLOUDFLARE_D1_DATABASE_ID`; the deployment workflow injects it only into an ignored generated Wrangler config.

```sh
npm run db:create -- mono-finance-development
npm run db:create -- mono-finance-production
```

Apply and inspect migrations against the local D1 binding in `wrangler.jsonc`. Its state persists in `.wrangler/state`, the exact directory shared by `npm run dev`; the binding has no remote `database_id` and must not be used to deploy the Worker:

```sh
npm run db:migrate:local
npm run db:migrations:local
npm run db:execute:local -- --command "SELECT name FROM d1_migrations"
```

The GitHub production deployment applies pending migrations before deploying the Worker. To run the same workflow from a trusted workstation, first set `CLOUDFLARE_D1_DATABASE_ID` in that process (do not commit it), then build and prepare the ignored production config:

```sh
npm run build
npm run prepare:production
npm run db:migrate:production
```

Wrangler records applied migrations. Re-running an apply command is safe: it applies only unapplied numbered files. Never edit a migration that may already be applied; add the next ordered `.sql` file instead. Production migrations must be backward-compatible with the currently deployed Worker because a Worker code rollback does not roll back D1 data or schema. `.gitattributes` enforces LF endings for SQL migration files because Wrangler's remote D1 migration parser has a known Windows CRLF + trigger failure mode.

## Empty remote database trigger workaround

If an entirely new remote D1 database returns `incomplete input: SQLITE_ERROR` while applying a migration that contains a SQLite trigger, do not retry through normal migration application indefinitely. First confirm that `d1_migrations` has no rows and that no application tables exist. Only then execute each migration file sequentially using `wrangler d1 execute --remote --file`, then insert the corresponding migration names into the existing `d1_migrations` table. This path uploads each SQL file intact and avoids Wrangler's migration-statement parser. Confirm that the migration table contains every applied filename before resuming `npm run db:migrate:production`.

Never use this workaround on a non-empty database or after any migration has been recorded: investigate and add a forward migration instead.
