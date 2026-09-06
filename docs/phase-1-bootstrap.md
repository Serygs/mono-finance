# Phase 1: Bootstrap architecture

## Objective

Replace the Cloudflare/Vite starter with a typed React SPA and a Hono-based Cloudflare Worker API foundation. This phase establishes boundaries only; it does not persist financial data, authenticate users, or call Monobank.

## Commands

- Development: `npm run dev`
- Build: `npm run build`
- Type check: `npm run typecheck`
- Lint: `npm run lint`
- Test: `npm test`
- Formatting check: `npm run format:check`

## Structure

- `src/app`: SPA router and application shell.
- `src/features`: feature-owned pages and future UI.
- `src/components`, `src/hooks`, `src/lib`, `src/styles`, `src/types`: shared frontend boundaries.
- `worker/routes`, `services`, `repositories`, `auth`, `monobank`, `analytics`, `common`: layered Worker boundaries.
- `migrations`: future D1 migration history.

## API contract

All successful API responses use `{ "data": ... }`. Errors use `{ "error": { "code": "...", "message": "..." } }`. `GET /api/health` is intentionally public and returns `{ "data": { "status": "ok" } }`.

## Environment policy

`wrangler.jsonc` defines `development` and `production` application modes. A local-only D1 binding was added in Phase 4 so authentication can run locally; production still requires an intentionally configured real database ID. Fake database IDs are prohibited.

## Verification

The health contract is tested against the exported Hono application. Full Workers-runtime, D1, authentication, and browser tests belong to their corresponding future phases.
