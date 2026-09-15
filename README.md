# Mono Finance

A self-hosted, single-user personal-finance dashboard for Monobank built with
React, TypeScript, Cloudflare Workers, and D1.

Each operator deploys an independent instance connected to their own Monobank
account. This repository does **not** include the author's Monobank access,
Cloudflare resources, production D1 data, owner account, or production
configuration. It is not a hosted multi-tenant financial service: there is no
public registration and each deployment creates exactly one owner through the
setup endpoint.

## Screenshots / Features

The checked-in design references are intended to use synthetic data only; do
not add real data to screenshots or fixtures. The application
provides password-protected owner access, Monobank account and transaction
sync, immutable source records with separate corrections and exclusions,
custom categories, compensation links, multi-currency analytics, responsive
dark-mode UI, and an installable PWA.

See the [self-hosting guide](docs/SELF_HOSTING.md) to run your own instance.

## Architecture

```text
React + TypeScript + Vite PWA
              |
              | same-origin /api/*
              v
Cloudflare Worker + Hono
        |             |
        v             v
Cloudflare D1    Monobank APIs
```

- `src/app/` owns routing and the application shell.
- `src/features/` contains feature-owned React components, hooks, and API adapters.
- `src/components/ui/` contains reusable, domain-neutral UI primitives.
- `src/lib/`, `src/styles/`, and `src/types/` contain shared browser infrastructure, styling, and types.
- `worker/routes/` maps HTTP requests and responses only.
- `worker/services/` owns use-case orchestration and transactional rules.
- `worker/repositories/` owns parameterized D1 access.
- `worker/auth/` owns password hashing, sessions, cookies, and same-origin protection.
- `worker/monobank/` owns provider DTOs, validation, mapping, request limits, and the server-only Personal API client.
- `worker/analytics/` owns aggregate financial queries.
- `worker/common/` contains shared Worker contracts, environment types, logging, and errors.
- `migrations/` contains ordered, additive D1 migrations.

The browser never receives D1 bindings, password or session hashes, provider payloads, or the Monobank token. Successful API responses use `{ "data": ... }`; failures use `{ "error": { "code": "...", "message": "..." } }`.

## Financial data rules

- D1 is the source of truth. IndexedDB is an encrypted, read-only cache.
- Imported Monobank transaction IDs, amounts, currencies, descriptions, MCC values, and timestamps are immutable.
- Adjustments, exclusions, category overrides, source-category mappings, and compensation links are stored separately.
- Effective amount is `adjustedAmountMinor ?? originalAmountMinor`.
- Excluded transactions remain browseable but are omitted from normal analytics.
- Effective category precedence is transaction override, source-category mapping, then imported MCC category.
- Money is stored and calculated as signed integer minor units; floating-point monetary storage is prohibited.
- Exchange rates are stored as reproducible integer numerator/denominator values with their source and timestamp.
- An expense may link to multiple same-currency incoming compensations without modifying either imported transaction.

## Features

- Password-protected owner account with no public registration.
- Monobank account/card synchronization and resumable transaction backfill.
- Account, date, direction, currency, category, exclusion, and description filters.
- Separate effective-amount adjustments and reversible analytics exclusions.
- Custom category creation, rename, merge, per-transaction overrides, and global MCC/source mappings.
- Deterministic compensation suggestions and manually confirmed reimbursement links.
- Expense, income, net cash flow, trends, categories, accounts, currencies, merchants, largest transactions, comparisons, and projections.
- Original-currency and reproducible base-currency analytics, initially configured for UAH.
- English and Ukrainian UI, responsive desktop/mobile layouts, dark mode, and accessible chart interactions.
- Installable PWA with safe-area support for iPhone, Android, Windows, and macOS.

## Self-hosting

- Node.js 24
- npm
- Your own Monobank Personal API token
- A Cloudflare account and authenticated Wrangler session for production deployment
- Playwright Chromium for browser tests

## Local development

Install dependencies and create the ignored local secret file:

```powershell
npm ci
Copy-Item .dev.vars.example .dev.vars
```

Set all three values in `.dev.vars`:

```dotenv
MONOBANK_TOKEN=your-personal-monobank-api-token
SESSION_TOKEN_PEPPER=a-long-random-secret
SETUP_TOKEN=a-different-long-random-secret
```

Generate the two random application secrets independently:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Never prefix these bindings with `VITE_`, place them in Wrangler `vars`, commit `.dev.vars`, or reuse the setup token as the session pepper.

Create the local schema and start the application:

```powershell
npm run db:migrate:local
npm run dev
```

The application is available at `http://localhost:5173`. Local D1 state is stored in `.wrangler/state`; use the provided migration commands so Wrangler and Vite access the same database.

## First owner setup

Owner creation is a one-time controlled operation. Replace the placeholder token, email, and password:

```powershell
curl.exe --request POST "http://localhost:5173/api/auth/setup" `
  --header "Content-Type: application/json" `
  --header "X-Setup-Token: your-setup-token" `
  --data '{"email":"you@example.com","password":"use-a-long-unique-password"}'
```

The endpoint returns `409` after an owner already exists. Rotate or remove the production setup token after successful owner creation.

## Security model

- Passwords use PBKDF2-HMAC-SHA-256 with a random 16-byte salt, 100,000 iterations, and a 32-byte derived key. Use a long, unique password because the Cloudflare runtime limit is below the current OWASP recommendation.
- Session cookies contain a random 256-bit opaque token. D1 stores only its HMAC-SHA-256 hash using `SESSION_TOKEN_PEPPER`.
- Sessions expire after eight hours and are revoked on logout.
- Cookies are `HttpOnly`, `SameSite=Strict`, `Path=/`, and `Secure` in production.
- Five failed logins per hashed client/email identifier within fifteen minutes trigger a fifteen-minute lockout.
- Unsafe authenticated requests enforce same-origin checks; the API intentionally emits no CORS allow-origin header.
- All API responses use `Cache-Control: no-store` and security headers. Static assets use the policy in `public/_headers`.
- D1 access uses prepared statements and bound parameters.
- Logs omit credentials, cookies, request bodies, balances, provider payloads, SQL messages, and stack traces from client responses.
- `npm run security:client-bundle` verifies that Worker secret binding names and `.dev.vars` paths are absent from `dist/client`.
- The root `sharp` override pins a patched release required by the current Miniflare dependency graph; remove it only after the upstream dependency adopts an equivalent or newer patched version.

Public endpoints are limited to health and the authentication lifecycle. All financial endpoints require the authenticated owner session.

## API

### Public and authentication

| Method | Path                | Purpose                                                                |
| ------ | ------------------- | ---------------------------------------------------------------------- |
| `GET`  | `/api/health`       | Liveness check returning `{ "data": { "status": "ok" } }`.             |
| `POST` | `/api/auth/setup`   | Create the only owner using `X-Setup-Token`; disabled after first use. |
| `POST` | `/api/auth/login`   | Validate credentials and issue the session cookie.                     |
| `POST` | `/api/auth/logout`  | Revoke the session and clear the cookie.                               |
| `GET`  | `/api/auth/session` | Return the current authenticated user or `401`.                        |

### Accounts, transactions, and synchronization

| Method | Path                            | Purpose                                                           |
| ------ | ------------------------------- | ----------------------------------------------------------------- |
| `GET`  | `/api/accounts`                 | Return safe D1-backed account/card data.                          |
| `POST` | `/api/sync/accounts`            | Idempotently synchronize account and card metadata from Monobank. |
| `GET`  | `/api/transactions`             | Return cursor-paginated D1 transactions with filters.             |
| `POST` | `/api/sync/transactions`        | Execute one bounded, resumable statement synchronization step.    |
| `GET`  | `/api/sync/transactions/status` | Return safe per-account synchronization state.                    |

`GET /api/transactions` accepts repeated `accountId`, inclusive UTC epoch-second `dateFrom` and `dateTo`, `direction=income|expense`, three-letter `currency`, exact effective `category`, `excluded=true|false`, literal case-insensitive `search`, an opaque `cursor`, and `limit` from 1 to 100.

### Transaction metadata

| Method           | Path                                                     | Purpose                                                |
| ---------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| `PUT` / `DELETE` | `/api/transactions/:transactionId/adjustment`            | Save or reset the effective amount and optional note.  |
| `PUT` / `DELETE` | `/api/transactions/:transactionId/exclusion`             | Exclude from or restore to normal analytics.           |
| `PUT` / `DELETE` | `/api/transactions/:transactionId/category`              | Save or reset a per-transaction category override.     |
| `GET` / `POST`   | `/api/transactions/:transactionId/compensations`         | Read suggestions/links or confirm a compensation link. |
| `DELETE`         | `/api/transactions/:transactionId/compensations/:linkId` | Remove a compensation relationship.                    |

Adjustments cannot reverse transaction direction. Compensation links require opposite directions, compatible currencies, unallocated incoming amounts, and explicit owner confirmation.

### Categories and currencies

| Method           | Path                                | Purpose                                                                 |
| ---------------- | ----------------------------------- | ----------------------------------------------------------------------- |
| `GET` / `POST`   | `/api/categories`                   | List or create owner categories.                                        |
| `PUT` / `DELETE` | `/api/categories/:categoryId`       | Rename/update or delete an unreferenced category.                       |
| `POST`           | `/api/categories/:categoryId/merge` | Atomically move references into another category and delete the source. |
| `GET`            | `/api/category-sources`             | List imported MCC/source category values.                               |
| `PUT` / `DELETE` | `/api/category-sources/:sourceCode` | Assign or reset a global source-category mapping.                       |
| `GET` / `PUT`    | `/api/preferences/currency`         | Read or update the analytics base currency.                             |
| `POST`           | `/api/exchange-rates/sync`          | Store the latest public Monobank exchange-rate snapshot.                |

Direct category deletion returns `409 category_referenced` while overrides or source mappings still reference it. Merge or reset those references first.

### Analytics

| Method | Path                        | Purpose                                                                                  |
| ------ | --------------------------- | ---------------------------------------------------------------------------------------- |
| `GET`  | `/api/analytics/overview`   | Totals, cash flow, daily average, comparison, compensations, exclusions, and projection. |
| `GET`  | `/api/analytics/breakdowns` | Category, account, currency, merchant, and largest-transaction aggregates.               |
| `GET`  | `/api/analytics/trends`     | Daily/monthly income, expense, net, and spending-trend series.                           |

Analytics accept repeated `accountId`, `dateFrom`, and `dateTo`; the required date range is capped at 366 days. Optional `baseCurrency` requests a reproducible converted view. Aggregate responses do not send the complete transaction ledger.

## Synchronization behavior

Account synchronization upserts provider metadata using stable Monobank identities. Missing accounts/cards are marked inactive rather than deleted, preserving historical transactions and application IDs.

Transaction synchronization performs exactly one provider statement request per manual or scheduled execution. Windows are limited to the provider-supported 31 days plus one hour. Initial backfill covers up to 365 days, moves backward using a persisted cursor, then switches to incremental synchronization with a one-day overlap. A short D1 lease prevents concurrent cron/manual imports; failed attempts leave the cursor replayable. `monobank_transaction_id` uniqueness and `ON CONFLICT DO NOTHING` make overlap and resume idempotent.

The Worker cron runs every five minutes and selects the least recently attempted active account. Monobank Personal API requests share a D1-backed one-request-per-60-seconds gate and are not automatically retried. Dashboard reads always use D1 and never call Monobank directly.

Provider failures map to safe error categories: unauthorized token, rate limit with `Retry-After`, timeout, malformed response, or unavailable upstream service. Provider bodies and identifiers are not returned to the browser.

## Multi-currency analytics

The original-currency view keeps currencies separate. Base-currency analytics use only a stored rate whose timestamp is at or before the transaction timestamp and may compose a cross-rate through UAH. Missing historical rates cause affected transactions to be omitted from the converted aggregate and reported by original currency; the application never silently applies a newer rate.

The Monobank public rate feed supplies current snapshots, not historical backfill. Consequently, older imported transactions remain available in original-currency analytics until an appropriate historical rate source is configured.

## PWA and offline behavior

The manifest, icons, Apple metadata, static headers, and service worker live in `public/`. The shell uses `viewport-fit=cover` and safe-area insets for the iPhone status area, Dynamic Island, home indicator, and mobile navigation.

The service worker caches only the public application shell and static assets; `/api/*` is always bypassed. Dashboard and transaction snapshots use network-first reads and AES-GCM-encrypted IndexedDB records with a non-extractable browser-generated key. Cache keys are SHA-256 hashes rather than readable URLs.

Offline snapshots are readable only within a browser session already verified through `/api/auth/session`. A refresh or new launch requires connectivity to validate the server session before decrypting cached data. HTTP authentication failures never fall back to cached responses. Reconnection reloads authoritative D1 data, and logout deletes the IndexedDB database and encryption key.

Known limitation: a browser restarted while offline cannot reopen financial data until it reconnects and verifies the session.

## UI conventions

Mono Finance uses an original Apple-inspired visual system without copying Apple assets. Financial legibility takes priority over decoration.

- Role tokens are defined in `src/styles/index.css`; reusable primitive styles are in `src/styles/design-system.css`; screen composition is in `src/styles/screen-layouts.css`.
- Use reusable components from `src/components/ui/` before adding feature-specific primitives.
- Keep content surfaces mostly opaque; reserve restrained blur for shell chrome and modal backdrops.
- Use tabular numerals and show immutable original values secondarily when an effective value differs.
- Maintain at least 44px touch targets, visible keyboard focus, semantic labels, dark-mode contrast, and reduced-motion support.
- Mobile layouts must respect safe-area insets and avoid page-level horizontal overflow at 430px, 390px, and 320px.
- Desktop content is capped at 90rem and should use available space without appearing like a stretched phone layout.

## D1 migrations

Migrations are plain SQL and use UTC Unix timestamps in seconds, integer minor-unit money, stable text IDs, rational exchange rates, and database constraints protecting imported transaction integrity.

```powershell
# Create remote databases once
npm run db:create -- mono-finance-development
npm run db:create -- mono-finance-production

# Inspect and apply the local schema
npm run db:migrations:local
npm run db:migrate:local
npm run db:execute:local -- --command "SELECT name FROM d1_migrations"
```

Wrangler records applied migration filenames, so normal apply commands are repeatable. Never edit a migration that may already have been applied; add the next ordered `.sql` file. Production migrations must remain backward-compatible because a Worker rollback does not roll back D1. `.gitattributes` enforces LF endings for SQL files to avoid Wrangler parsing failures with Windows CRLF and SQLite triggers.

If a completely empty remote database returns `incomplete input: SQLITE_ERROR` for a trigger migration, first verify that `d1_migrations` and application tables are empty. Only then apply each migration using `wrangler d1 execute --remote --file` and record its filename in `d1_migrations`. Never use this workaround on a populated or partially migrated database; create a forward migration instead.

## Commands and testing

| Command                          | Purpose                                                          |
| -------------------------------- | ---------------------------------------------------------------- |
| `npm run dev`                    | Start the local Vite/Worker development server.                  |
| `npm run format:check`           | Verify Prettier formatting.                                      |
| `npm run lint`                   | Run ESLint.                                                      |
| `npm run typecheck`              | Run strict TypeScript project checks.                            |
| `npm test`                       | Run Vitest unit, repository, migration, API, and frontend tests. |
| `npm run test:coverage`          | Run coverage-gated tests.                                        |
| `npm run test:e2e`               | Run Playwright critical browser flows.                           |
| `npm run build`                  | Build the frontend and Worker.                                   |
| `npm run security:client-bundle` | Scan the browser artifact for secret leakage.                    |
| `npm run audit:dependencies`     | Fail on high or critical dependency advisories.                  |

Install Chromium once before local browser testing:

```powershell
npx playwright install chromium
```

Coverage floors are 65% statements, 60% branches, 62% functions, and 67% lines. Do not reduce them to accept a regression.

Tests use synthetic financial fixtures and no real secrets. Repository tests currently use focused D1 fakes and migration assertions rather than a disposable Miniflare database. E2E tests mock same-origin APIs and do not contact Monobank or production Cloudflare resources. Offline cryptography is unit-tested, while full service-worker offline behavior is not yet exercised in a real offline browser context.

## CI/CD and production deployment

`.github/workflows/quality.yml` runs formatting, linting, type checking, coverage, build, client-bundle security scanning, dependency audit, and Playwright tests on pull requests and `main`. A successful push to `main` deploys through the protected GitHub `production` environment. GitHub Actions is the only deployment authority so migrations, artifact verification, deployment, and health checking remain one ordered workflow.

### One-time Cloudflare and GitHub setup

1. Create the production D1 database with `npm run db:create -- mono-finance-production`.
2. In GitHub **Settings → Environments → production**, restrict deployments to `main` and configure required reviewers.
3. Add environment variables:
   - `CLOUDFLARE_D1_DATABASE_ID`: the D1 UUID.
   - `PRODUCTION_HEALTH_URL`: the full HTTPS URL ending in `/api/health`.
4. Add environment secrets:
   - `CLOUDFLARE_ACCOUNT_ID`.
   - `CLOUDFLARE_API_TOKEN`, scoped only for Worker script and D1 edits plus route/zone edits if Wrangler manages a custom route.
5. Configure `MONOBANK_TOKEN`, `SESSION_TOKEN_PEPPER`, and `SETUP_TOKEN` directly as encrypted secrets on the production Worker. Do not store these application secrets in GitHub or committed configuration.
6. Protect `main` with pull-request reviews and required `Quality gates` checks.

Production deployment reads only the `production` environment secrets and
variables configured in the fork that runs it. Pull-request jobs are
secret-free and cannot invoke deployment. See [SELF_HOSTING.md](docs/SELF_HOSTING.md)
for a complete setup from a fresh fork.

Production D1 configuration is generated into the ignored `dist/mono_finance/wrangler.production.json`; `wrangler.jsonc` intentionally contains no production database UUID.

For a trusted workstation release, set `CLOUDFLARE_D1_DATABASE_ID` and `PRODUCTION_HEALTH_URL` only in the current process, then run:

```powershell
npm run release:production
```

`npm run deploy:production` is also self-contained: it rebuilds the production
artifact and generates `wrangler.production.json` before invoking Wrangler. Use
`release:production` when pending production D1 migrations must be applied
before deployment.

The GitHub workflow is the preferred release path. After deployment, verify the HTTPS health endpoint, authentication, a read-only dashboard request, synchronization status, and installed PWA behavior.

### Rollback

Roll back Worker code from Cloudflare Workers deployments and rerun the health check. Code rollback does not revert D1 migrations, secrets, or Monobank effects. Fix schema problems with a new forward migration; never modify or manually reverse an applied production migration.

## Required secrets

Server-only secrets are configured outside tracked source. `MONOBANK_TOKEN` is
the deployer's own Personal API token; `SESSION_TOKEN_PEPPER` is an independent
high-entropy session secret; and `SETUP_TOKEN` is a temporary bootstrap secret.
Normal configuration such as the D1 database ID and health URL is supplied as
fork-owned deployment variables. Never prefix server secrets with `VITE_`.

## Forking and customization

Forks are independent deployments. Create a new D1 database, configure your
own Cloudflare account and Worker secrets, run migrations, and create your one
owner through `/api/auth/setup`. Do not copy production rows, IDs, tokens, or
configuration from another instance.

## Privacy

### Custom merchant and category icons

Owner-uploaded icons live in the deployment's dedicated D1 visual-assets table,
never in immutable transaction rows. They are private, validated/sanitized, and
not source-controlled. See [self-hosting](docs/SELF_HOSTING.md) for limits and
priority.

Financial data remains in the operator's D1 database and Cloudflare account.
The repository contains no production transactions or credentials. Operators
must protect their owner password, secrets, logs, backups, custom domain, and
any exports they create.

## License

Mono Finance is available under the [MIT License](LICENSE).

## Observability and recovery

The Worker emits structured JSON logs with request ID, safe route, status, duration, error name/code, and sanitized bounded messages. D1 failures omit exception messages that might include SQL. Workers logs/traces are enabled, and aggregate request, authentication-failure, and internal-error metrics are written to the `mono-finance-observability` Analytics Engine dataset.

- Use the `X-Request-Id` response header to find the matching event in Workers Logs or `wrangler tail`.
- Monitor `api_request_failed`, `d1_query_failed`, `scheduled_transaction_sync_failed`, and elevated `authentication_failure` events.
- Configure Cloudflare notifications for sustained Worker 5xx errors, D1 quota limits, scheduled-sync failures, and an external HTTPS health check.
- For failed synchronization, resolve token/rate-limit/connectivity problems and use the normal manual refresh. Transaction uniqueness makes replay safe.
- For D1 failures, inspect D1 Metrics and `wrangler d1 insights`; do not retry writes outside idempotent synchronization paths.

D1 is authoritative. Before destructive recovery, use Cloudflare D1 backups/time travel according to account policy. Export only through a trusted authenticated workstation using read-only parameterized queries, encrypt exported financial data at rest, and exclude secrets, password/session hashes, and raw operational logs. Periodically test restoration into a separate database.

## Codex project skills

Repository-scoped skills live in `.agents/skills/` and are automatically discovered when Codex works from this repository. Invoke `$mono-finance-dev` for changes to application code, schema, APIs, analytics, integrations, offline behavior, or customer-facing UI.

Installed skill groups:

- Cloudflare platform, Workers, and Wrangler guidance.
- Specification, incremental implementation, test-driven development, and code review workflows.
- React performance, frontend design, web design, dashboard UX, and data visualization guidance.
- The project-specific `mono-finance-dev` domain and architecture rules.

These skills are repository-local workflow assets and add no runtime dependency. The OWASP Secure Agent Playbook was not installed because its skills depend on unresolved Claude-plugin resources. The requested generic offline-first skill was not installed because it treats IndexedDB as authoritative, conflicting with this application's D1 source-of-truth and encrypted-cache rules.
