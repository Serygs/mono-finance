# Authentication boundary

This directory owns password hashing, session-token generation, cookie handling, same-origin checks, and the D1-backed authentication use cases. Routes stay in `worker/routes/auth.ts`; parameterized D1 access stays in `worker/repositories/auth-repository.ts`.

Never import this directory from `src/`, log passwords or tokens, or return its internal errors to the browser. See [Phase 4 authentication](../../docs/phase-4-authentication.md) for setup and deployment instructions.
