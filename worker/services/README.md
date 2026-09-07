# Services

Services orchestrate use cases and own transactional business rules. Routes must not contain business logic.

`AccountService` obtains the validated internal client-info snapshot from the Monobank boundary, delegates idempotent D1 persistence, and returns only the safe account view used by the API.

`TransactionSyncService` claims one eligible account window, requests the validated statement through the rate-limited Monobank client, imports immutable transaction source records, and advances or safely fails the D1 cursor. It emits structured operational logs without credentials or provider payloads.
