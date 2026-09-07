# Monobank boundary

This directory contains the server-only Monobank Personal API boundary:

- `client.ts` performs authenticated client-info and statement requests.
- `provider-dtos.ts` and `validation.ts` describe and validate provider payloads.
- `internal-dtos.ts` and `mappers.ts` convert provider data before it reaches persistence or application services.
- `rate-limit.ts` coordinates requests through a persistent gate; its D1 adapter lives in `worker/repositories/`.

No module in `src/` may import this directory. The `MONOBANK_TOKEN` binding is read only by `factory.ts` and must never appear in browser responses or logs. Account and transaction synchronization consume only its mapped internal DTOs; provider DTOs remain isolated here.
