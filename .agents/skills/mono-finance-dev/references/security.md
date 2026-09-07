# Security

## Sensitive data boundary

The Monobank API token is server-side only. Never expose or commit Monobank tokens, password hashes, session tokens, stack traces, SQL errors, or any other secrets.

Do not put secrets in `src/`, committed configuration, test fixtures, logs, API responses, or client-visible environment values. Use Cloudflare Worker secret bindings for credentials. Log only the minimum safe context necessary for diagnosis.

## API and data handling

Validate untrusted HTTP and provider input at the Worker boundary. Use parameterized D1 queries; never build SQL by string concatenation. Map failures to safe API errors and preserve internal diagnostic detail only in secure server-side observability.

Every private route must pass the authentication and authorization boundary. Only intentionally public endpoints, such as health and designated authentication endpoints, may bypass it. Do not rely on frontend route visibility as authorization.

## Offline cache

D1 remains authoritative. If offline caching is introduced, treat IndexedDB as a local cache only and encrypt sensitive cached financial data. Do not use offline cache state to weaken authentication or expose financial data across users or browser profiles.
