# Repositories

Repositories own parameterized D1 access and provider-agnostic persistence mapping. They are introduced with the Phase 3 schema.

`D1MonobankRateLimitStore` is operational persistence for outbound API request windows; it does not store provider payloads or credentials.

`D1AccountsRepository` atomically upserts mapped accounts, currencies, masked cards, and one initial sync-state row per account. Missing provider records are retained and marked inactive so transaction history and stable application IDs remain intact.
