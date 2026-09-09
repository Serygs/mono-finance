# Phase 18: Security hardening

This review covers the private financial-data boundary: browser-to-Worker API calls, D1 access, Monobank credentials, authentication, and encrypted offline cache.

## Findings and remediation

| Severity | Finding                                                                                                                                                                     | Status                                                                                                                                                                                                             |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| High     | API error and less-used route responses could omit a cache policy and browser security headers. Cloudflare may apply heuristic caching when no cache directive is supplied. | Fixed: a top-level Hono middleware now applies `Cache-Control: no-store`, CSP, anti-framing, MIME-sniffing, referrer, permissions, and same-origin resource policies to every `/api/*` response, including errors. |
| High     | The app shell had no deployed static-asset header policy, so a future XSS issue would have a wider browser execution surface.                                               | Fixed: `public/_headers` applies a restrictive static CSP, anti-framing, isolation, referrer, permissions, MIME-sniffing, and HSTS policies.                                                                       |
| Medium   | There was no automated assertion that Worker secret binding names or `.dev.vars` reached the browser bundle.                                                                | Fixed: `npm run security:client-bundle` scans `dist/client`; CI runs it after every build.                                                                                                                         |
| Medium   | Dependency vulnerability status was checked manually only.                                                                                                                  | Fixed: CI runs `npm run audit:dependencies` and fails for high/critical advisories.                                                                                                                                |
| Low      | Cross-origin API access should remain unavailable by default.                                                                                                               | Verified: no CORS headers are emitted; mutation requests retain same-origin validation and the session cookie is `HttpOnly`, `SameSite=Strict`, and production-only `Secure`.                                      |

## Controls verified

- Passwords use PBKDF2-SHA-256 with a per-password random salt and Cloudflare workerd's maximum of 100,000 iterations; session tokens are random and only an HMAC hash is persisted.
- Sessions have an eight-hour absolute expiry, revocation on logout, and private routes require the server-side session check.
- Initial owner setup is protected by a constant-time setup-token comparison and can succeed only once.
- Login failures are rate limited by a hashed client/email identifier; failures do not disclose whether the account or password was wrong.
- D1 repositories use prepared statements and bound parameters. Imported Monobank data remains immutable.
- Monobank credentials are accessed only through the Worker binding and are neither returned nor included in structured logs.
- The service worker bypasses `/api/*`; recent financial snapshots use AES-GCM-encrypted IndexedDB records and logout deletes the database/key.
- The Cloudflare development toolchain requires `@cloudflare/vite-plugin` 1.54.6 or newer and Wrangler 4.130.0 or newer. The root `sharp` override pins the patched 0.35.4 release because the current Miniflare package still declares vulnerable 0.35.2 exactly; remove the override after Miniflare adopts an equivalent or newer patched release.

## Accepted risks and follow-up

- Cloudflare's production Web Crypto runtime rejects PBKDF2 requests above 100,000 iterations. This is below the current OWASP PBKDF2-SHA-256 recommendation, so the private owner must use a long, unique password; moving to a stronger Workers-compatible password KDF remains a future security improvement.
- The encrypted offline cache is protected at rest within a browser profile, not against arbitrary script execution in that same origin. CSP and dependency hygiene reduce that exposure; users must log out on shared devices.
- D1 behavior is tested with focused repository fakes and migration assertions, not a disposable Miniflare D1 integration environment.
- Cloudflare Vite intentionally copies `.dev.vars` to `dist/mono_finance` for local `vite preview`; Cloudflare documents that this preview-only file is not deployed. The client asset directory is `dist/client`, and CI verifies it contains no secret binding names or `.dev.vars` paths.
- Production deployment still needs an actual D1 binding and Cloudflare secret provisioning. Verify `wrangler secret` configuration and HTTPS-only custom-domain behavior before first production release.
