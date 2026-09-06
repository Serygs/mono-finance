# D1 migrations

`0001_initial_schema.sql` establishes the financial data model and `0002_authentication.sql` adds durable login-rate-limit state. The migrations are deliberately plain SQL: no ORM is used, and repository code binds all dynamic query values with D1 prepared statements.

## Timestamp and money conventions

- Every timestamp is an `INTEGER` UTC Unix epoch in seconds.
- Every monetary value is a signed `INTEGER` in currency minor units.
- Imported Monobank transaction source fields are protected by a database trigger. Model corrections through adjustment, exclusion, category-override, and compensation tables instead of updating the source record.
- Exchange rates are rational values (`rate_numerator / rate_denominator`) with their source and timestamp, rather than floats.

## Workflow

Create a real remote database once for each environment. Do not copy the returned ID into the repository until the matching environment binding is intentionally configured.

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

After configuring the actual production D1 binding and confirming the target database, apply remotely:

```sh
npm run db:migrate:remote -- mono-finance-production --remote
```

Wrangler records applied migrations. Re-running an apply command is safe: it applies only unapplied numbered files. Never edit a migration that may already be applied; add the next ordered `.sql` file instead.
