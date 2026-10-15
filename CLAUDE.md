# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**`AGENTS.md` holds the binding project rules** (product invariants, architecture boundaries, security, localization, design system, responsive layout, dashboard/chart rules, validation policy). Read it first; this file does not repeat it. Repository-specific skills live in `.agents/skills/` — `mono-finance-dev` (with `references/` for architecture, security, Monobank domain, transaction and analytics rules, UI guidelines) and `mono-finance-ui`.

## Commands

Node.js 24, npm. Shell examples in the README are PowerShell.

```powershell
npm ci; Copy-Item .dev.vars.example .dev.vars   # then set MONOBANK_TOKEN, SESSION_TOKEN_PEPPER, SETUP_TOKEN
npm run dev                  # applies pending LOCAL D1 migrations, then starts Vite + Worker at http://localhost:5173
npm run db:migrate:local     # local D1 state lives in .wrangler/state
npm run db:execute:local -- --command "SELECT name FROM d1_migrations"

npm run lint                 # ESLint
npm run typecheck            # tsc -b (app, node, worker tsconfigs)
npm run format:check         # Prettier (CI runs this)
npm run i18n:check           # uk/en translation parity
npm test                     # Vitest, all unit/repository/migration/API/frontend tests
npm run test:coverage        # coverage-gated (thresholds in vitest.config.ts), what CI runs
npx vitest run worker/services/category-service.test.ts   # single file
npx vitest run -t "test name"                              # single test by name

npx playwright install chromium   # once
npm run test:e2e                                           # Playwright, starts dev server on :4173
npm run test:e2e -- tests/e2e/critical-finance-flow.spec.ts --workers=2
npm run build && npx playwright test --config playwright.pwa.config.ts   # real Service Worker update tests

npm run build                # i18n:check + tsc -b + production build
npm run security:client-bundle   # verify no secret names leak into dist/client
```

Deployment happens only through GitHub Actions on push to `main` (`.github/workflows/quality.yml`: format, lint, typecheck, coverage, build, bundle scan, audit, 2 sharded Playwright runs, then migrate → deploy → healthcheck). Don't run `deploy*`/`release*`/`db:migrate:production` locally.

## Architecture

Single Cloudflare Worker serving both the SPA assets and `/api/*` (Hono), backed by D1. Configured in `wrangler.jsonc` with `development` and `production` envs; the production D1 binding is injected into the build artifact by `scripts/prepare-production-deployment.mjs`.

### Worker (`worker/`)

- `index.ts` exports `fetch` (delegates to the Hono `app` in `app.ts`) and `scheduled` — a 5‑minute cron that calls `TransactionSyncService.synchronizeNext()` for resumable Monobank backfill.
- `app.ts` is the composition root: auth/session middleware, same-origin checks, security headers, and route registration. Services are constructed per request through `services/*-service-factory.ts`, which wire `D1*Repository` instances from `environment.DB` — follow this factory pattern when adding a service.
- Layering: `routes/` (HTTP mapping only) → `services/` (use cases, transactional rules) → `repositories/` (parameterized D1 SQL). `monobank/` keeps provider DTOs (`provider-dtos.ts`) separate from `internal-dtos.ts` via `mappers.ts`/`validation.ts`, and owns rate limiting. `analytics/` has currency conversion; `exchange-rates/` abstracts the rate source. `common/` has the `{data}`/`{error}` response helpers (`api-response.ts`), env types, D1 error classification, and redacting observability.
- Tests sit next to sources (`*.test.ts`). Repository tests use focused D1 fakes and migration assertions, not a real Miniflare DB.

### Financial data model

- Effective amount = `adjustedAmountMinor ?? originalAmountMinor`; excluded transactions stay browseable but are omitted from analytics.
- Effective category precedence: per-transaction override → source-category mapping → imported MCC category.
- Exchange rates are stored as integer numerator/denominator with source and timestamp.
- Compensations link an expense to one or more same-currency incoming transactions without modifying either.

### Migrations (`migrations/`)

Plain ordered SQL (`NNNN_name.sql`) with adjacent `*.test.ts` assertions. Never edit an applied migration — add the next file. Migrations must stay backward-compatible because Worker rollback doesn't roll back D1. SQL files must keep LF endings (enforced by `.gitattributes`; CRLF breaks Wrangler with triggers). Timestamps are UTC Unix seconds.

### Frontend (`src/`)

React 19, React Router, TanStack Query, `react-grid-layout` for the dashboard, `motion` for animation. See `docs/FRONTEND_STRUCTURE.md` for ownership boundaries.

- `app/` — router, shell, and `LegacyPageRoutes.tsx` (legacy hash-route adapters).
- `lib/` — `api-client.ts`/`private-api-client.ts` (same-origin calls; private client handles 401 → session end), `money-presentation.ts`, `date-presentation.ts`.
- `features/dashboard/` — filters, queries, sync, and widget preferences/config/registry are separate hooks; `widgets/` holds KPI, recent rows, and charts. Financial query keys must not depend on layout/visibility.
- `features/offline/` — service-worker registration/update policy and AES-GCM encrypted IndexedDB snapshot cache. Updates wait for an explicit user action and are blocked by open editors (`UpdateProtectedEditor`, `use-update-blocker`) and pending mutations. Logout/401 clears query caches and the IndexedDB DB, and is broadcast across tabs.
- `features/localization/messages.ts` — translation keys are the English strings themselves (`ENGLISH_MESSAGE_KEYS` → `TranslationKey`), with `ENGLISH_MESSAGES` and `UKRAINIAN_MESSAGES` maps; use `useLocalization()` in components. Add every new key to both maps (`scripts/check-localization.mjs` enforces parity).
- Styles: tokens and base in `src/styles/index.css`, shared primitives in `src/components/ui/ui.css`, shell in `src/app/app-shell.css`, feature CSS adjacent to its feature.
- PWA manifest, service worker, and static `_headers` live in `public/`. The service worker never caches `/api/*`.

### E2E tests (`tests/`)

`tests/e2e/` mocks same-origin APIs (fixtures in `tests/e2e/fixtures/`) and blocks service workers; it never contacts Monobank or Cloudflare. `tests/pwa/` runs against built production assets via `tests/pwa/server.mjs`. Use only synthetic financial data in fixtures and screenshots.
