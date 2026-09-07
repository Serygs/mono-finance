# Testing strategy

Mono Finance uses a test pyramid. Fast deterministic tests protect domain rules first; repository and Hono route tests protect persistence and HTTP boundaries; a small Playwright suite verifies the critical private-finance flow in a real browser. Financial fixtures contain only synthetic values and no secrets.

## Test layers

| Layer                    | Scope                                                                                                                                                                   | Location and command                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Unit                     | Immutable transaction corrections, compensations, effective category, money/currency conversion, analytics, Monobank mapping/rate limiting, auth crypto/helpers         | `worker/**/*.test.ts`, `src/**/*.test.ts[x]`; `npm test`                  |
| Repository and migration | D1 query bindings, duplicate prevention, filters, adjustments, compensation persistence, repeatable migration assertions                                                | `worker/repositories/**/*.test.ts`, `migrations/**/*.test.ts`; `npm test` |
| API                      | Exported Hono application: authentication, accounts, transactions, analytics, and synchronization contracts, status codes, safe errors, and CSRF/same-origin protection | `worker/routes/**/*.test.ts`, `worker/auth/auth.test.ts`; `npm test`      |
| Frontend                 | Formatting, API adapters, account filter persistence, offline encryption/policy, design-system semantics, dashboard transformations                                     | `src/**/*.test.ts[x]`; `npm test`                                         |
| Browser                  | Login, dashboard loading, account filtering, adjustment, exclusion/restore, category override, compensation linking, dashboard evidence, and logout                     | `tests/e2e/critical-finance-flow.spec.ts`; `npm run test:e2e`             |

## Local quality gates

```sh
npm run format:check
npm run lint
npm run typecheck
npm run test:coverage
npm run build
npm run test:e2e
```

Install Playwright's browser once on a developer machine before the browser command:

```sh
npx playwright install chromium
```

V8 coverage has repository-wide floors derived from the Phase 17 baseline: 65% statements, 60% branches, 62% functions, and 67% lines. Raise these deliberately with new coverage; never reduce them to accept a regression.

## CI

[`.github/workflows/quality.yml`](../.github/workflows/quality.yml) runs formatting, linting, strict type checking, coverage-gated tests, and production build on pull requests and `main`. A separate browser job installs Chromium and executes the mock-backed critical-flow test. The browser mock is intentionally limited to frontend orchestration; it does not replace the Worker route, D1, or Monobank client tests.

## Known limitations

- D1 repository tests currently use focused fakes and migration structure assertions, not a disposable Cloudflare D1/Miniflare database. Add that integration harness when a supported Worker/D1 test runtime is adopted.
- Browser tests mock same-origin API responses and do not call Monobank, real Cloudflare bindings, or production authentication secrets.
- Offline encryption is unit-tested for cryptographic round trips, but service-worker behavior is not executed in a real offline browser context yet.
- Coverage is repository-wide and cannot prove every D1 SQL execution path; high-risk persistence changes still require focused repository tests.
