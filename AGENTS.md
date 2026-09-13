# Mono Finance engineering rules

## Product boundaries

- This is a private, single-user financial application. Treat all account and transaction data as sensitive.
- The browser communicates only with same-origin `/api/*` endpoints.
- Keep Monobank calls, D1 access, secrets, and authentication decisions in `worker/`.
- Imported Monobank transactions are immutable source records.
- Corrections, exclusions, category overrides, and compensation links must use separate records; never overwrite original provider fields.
- Monetary storage and calculations use integer minor units. Never introduce floating-point money values.
- D1 is the authoritative database. IndexedDB may be used only as an encrypted offline cache, never as a competing source of truth.

## Architecture

- Keep React code feature-oriented:
  - feature-owned UI and hooks → `src/features/<feature>/`
  - reusable UI → `src/components/`
  - API/browser infrastructure → `src/lib/`
- Keep Worker routes thin:
  - HTTP mapping → `worker/routes/`
  - business/use-case logic → `services/`
  - parameterized D1 access → `repositories/`
- Keep Monobank DTOs and client code isolated in `worker/monobank/`.
- Do not expose Monobank/provider response shapes directly to the frontend.
- Use the shared response contract:
  - success: `{ data }`
  - failure: `{ error: { code, message } }`
- Never expose stack traces, SQL errors, upstream payloads, tokens, secrets, or internal error messages.
- Do not add a D1 binding with a placeholder database ID.
- Keep local D1 configuration explicit and inject the real production ID through protected deployment configuration.

## Security

- Never place Monobank tokens, passwords, session identifiers, or secrets in:
  - `src/`
  - committed configuration
  - logs
  - tests
  - error responses
- Keep secret bindings server-side and configure them with Wrangler secrets, not `vars`.
- Every private API route must be protected by the authentication boundary.
- Only explicitly public endpoints may bypass authentication.

## Localization

- The application supports exactly two UI locales: `uk` and `en`.
- Every user-facing string must use the localization system.
- Every translation key must exist in both locales; adding a key to only one locale is invalid.
- Missing locale keys must fail `npm run i18n:check` and therefore fail the build/CI.
- Do not use localization fallback to hide missing translations.
- Do not add hardcoded user-facing strings to React components.
- When changing UI copy, update both `uk` and `en` translations in the same change.
- New pages, components, widgets, validation messages, tooltips, and empty states must include both languages.
- Preserve the user's selected locale across reloads and sessions.
- Before completing a frontend task that changes visible text, run the localization parity check.
- Do not translate identifiers, API values, database values, MCC codes, currency codes, logs, or other technical values unless explicitly displayed as localized UI copy.

## Agent execution rules

### Scope

- Keep the implementation strictly limited to the requested task.
- Do not refactor, rename, move, or redesign unrelated code.
- Do not add features that were not requested.
- Do not introduce new dependencies unless the task cannot reasonably be implemented with the existing stack.
- Preserve existing behavior unless the task explicitly requests a behavior change.
- Prefer the smallest correct implementation.

### Repository inspection

- Load the applicable skill from `.agents/skills` before implementation.
- Do not scan or read the entire repository.
- Use code search first to locate the relevant implementation.
- Read only:
  - files directly affected by the task;
  - their immediate dependencies;
  - relevant tests.
- Inspect only the boundaries required by the task.
  - Frontend-only task → do not inspect Worker/D1 unless required by an existing contract.
  - Worker-only task → do not inspect unrelated frontend code.
  - Styling/layout task → do not inspect backend/database implementation.
- Do not reread unchanged files unless new information makes it necessary.
- If an unrelated issue is discovered, report it instead of fixing it.

### Implementation

- Before coding, identify the small set of files expected to change.
- Reuse existing components, utilities, styles, services, and patterns.
- Avoid speculative abstractions.
- Do not create generic infrastructure for a single simple use case unless the repository already follows that pattern.
- Add or update focused tests only when behavior changes.
- Pure visual/CSS changes do not require new behavioral tests unless existing tests need adjustment.

## Validation

Validate proportionally to the change.

### During implementation

- Do not run the full validation suite after every edit.
- Implement the change first.
- Use targeted tests or targeted checks while iterating when practical.
- Do not repeatedly rerun a command that already passed unless subsequent changes could affect it.

### Frontend-only UI/style changes

Run relevant lightweight validation first:

```bash
npm run typecheck
npm run lint
```
