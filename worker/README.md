# Worker architecture

- `routes/`: HTTP request/response mapping only.
- `services/`: use-case orchestration and domain rules.
- `repositories/`: D1 persistence boundary.
- `auth/`: sessions and authorization.
- `monobank/`: server-only provider integration.
- `analytics/`: aggregate queries over persisted data.
- `common/`: shared API contracts and runtime types.

The Worker exposes only `/api/*`. The browser never receives provider tokens or D1 bindings.
