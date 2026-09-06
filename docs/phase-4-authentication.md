# Phase 4: authentication and session security

## Endpoints

| Endpoint                | Access                                            | Purpose                                              |
| ----------------------- | ------------------------------------------------- | ---------------------------------------------------- |
| `POST /api/auth/setup`  | setup secret required; only while no owner exists | Creates the one application owner.                   |
| `POST /api/auth/login`  | public                                            | Validates credentials and issues a session cookie.   |
| `POST /api/auth/logout` | public, same-origin                               | Revokes the presented session and clears its cookie. |
| `GET /api/auth/session` | public endpoint with session validation           | Returns the current authenticated user or `401`.     |
| `GET /api/health`       | public                                            | Liveness endpoint.                                   |

All other `/api/*` paths pass the session middleware before route matching. This makes a future private endpoint protected by default rather than relying on each route to remember an auth check.

## Security decisions

- Password hashes use Workers Web Crypto PBKDF2-HMAC-SHA-256 with a 16-byte per-password salt, 600,000 iterations, and a 32-byte derived key. Passwords are accepted only at the route boundary and are neither logged nor persisted in plaintext.
- Session cookies contain an opaque, cryptographically random 256-bit token. D1 stores only an HMAC-SHA-256 hash keyed by `SESSION_TOKEN_PEPPER`; sessions expire after eight hours and logout records a revocation timestamp.
- Cookies are `HttpOnly`, `SameSite=Strict`, `Path=/`, and use `Secure` in production. Authenticated responses use `Cache-Control: no-store`.
- Unsafe auth and protected requests reject an `Origin` that is not the request's own origin. Combined with the strict same-site cookie, this is the CSRF defense for this same-origin SPA; do not introduce cross-origin frontend hosting or external auth redirects without revisiting it.
- Failed login counters are durable in D1, keyed by an HMAC of client identifier and normalized email. Five failures in fifteen minutes lock that identifier for fifteen minutes. The API returns the same generic credential error for a missing user and a wrong password.
- `POST /api/auth/setup` requires `X-Setup-Token` to match the Worker-only `SETUP_TOKEN` and is permanently unavailable after an owner exists. Rotate the setup token after first use.

## Local setup

Apply migrations, then copy the safe template and provide real local secret values outside version control:

```sh
npm run db:migrate:local
Copy-Item .dev.vars.example .dev.vars
npm run dev
```

The migration command intentionally targets `.wrangler/state`, the same local D1 persistence directory used by Vite. Do not substitute a different `--persist-to` path or the running Worker will see a separate empty database.

Use a cryptographically random value for each local secret. `SETUP_TOKEN` is supplied only to the one-time setup request, for example with an API client; it must never be embedded in the React application.

## Production prerequisite

`wrangler.jsonc` intentionally contains no production D1 ID. Before deployment, add the real `DB` binding under `env.production.d1_databases` and then set each secret through Wrangler, never through `vars` or a command argument:

```sh
wrangler secret put SESSION_TOKEN_PEPPER --env production
wrangler secret put SETUP_TOKEN --env production
```

After changing bindings, run `npm run cf-typegen`, apply migrations to the confirmed production database, and only then deploy. A production deployment without that D1 binding is intentionally invalid.
