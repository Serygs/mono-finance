# Phase 10: custom categories

Custom categories are owner-scoped records in D1. They contain a name, optional icon token, and optional UI color token. They are managed at **Settings** and are available from the transaction details panel.

`transaction_category_overrides` stores a selected custom category separately from the imported transaction. The effective category is the override when present, otherwise the transaction's preserved Monobank/MCC category. Resetting an override removes only that separate record.

## API

- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/:categoryId`
- `DELETE /api/categories/:categoryId`
- `PUT /api/transactions/:transactionId/category`
- `DELETE /api/transactions/:transactionId/category`

All endpoints require the authenticated owner and mutation endpoints also require the existing same-origin protection. A referenced category returns `409 category_referenced` on deletion; reset or reassign transaction overrides first.
