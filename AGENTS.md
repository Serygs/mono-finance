# Mono Finance engineering rules

## Product boundaries

- This is a private, single-user financial application. Treat all account and transaction data as sensitive.
- The browser communicates only with same-origin `/api/*` endpoints. Keep Monobank calls, D1 access, secrets, and authentication decisions in `worker/`.
- Imported Monobank transactions are immutable source records. Future corrections, exclusions, category overrides, and compensation links must use separate records; never overwrite original provider fields.
- Monetary storage and calculations use integer minor units. Never introduce floating-point money values.
- D1 is the authoritative database. IndexedDB may become an encrypted offline cache, never a competing source of truth.

## Architecture

- Keep React code feature-oriented: feature-owned UI and hooks stay in `src/features/<feature>/`; reusable UI belongs in `src/components/`; API and browser infrastructure belongs in `src/lib/`.
- Keep Worker routes thin. `worker/routes/` maps HTTP only; use cases belong in `services/`; parameterized D1 access belongs in `repositories/`.
- Keep Monobank DTOs and client code isolated in `worker/monobank/`. Do not expose provider response shapes to the frontend.
- Use the shared `{ data }` and `{ error: { code, message } }` response contract. Do not expose stack traces, SQL errors, upstream payloads, tokens, or internal messages.
- Do not add a D1 binding with a placeholder database ID. Provision it in Phase 3 and configure matching development and production bindings together.

## Security

- Never place Monobank tokens, passwords, session identifiers, or secrets in `src/`, committed configuration, logs, tests, or error responses.
- Keep secret bindings server-side and configure them with Wrangler secrets, not `vars`.
- Every private API route added after authentication must be protected by the authentication boundary; only explicitly public endpoints may bypass it.

## Delivery checks

- Before changing a feature, load the applicable skill from `.agents/skills` and inspect the affected frontend and Worker boundaries.
- Add a focused test for each behavioral change. Test Worker routes through exported Hono apps before adding broader runtime tests.
- Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` before handoff when the change affects application code.
- After every completed implementation, include exactly one concise, one-sentence commit message in the handoff.
- Do not add Monobank synchronization, D1 schema, authentication, analytics, or offline persistence ahead of their dedicated phases in `prompts.md`.
