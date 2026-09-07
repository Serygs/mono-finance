# Services

Services orchestrate use cases and own transactional business rules. Routes must not contain business logic.

`AccountService` obtains the validated internal client-info snapshot from the Monobank boundary, delegates idempotent D1 persistence, and returns only the safe account view used by the API.
