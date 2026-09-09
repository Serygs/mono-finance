# Phase 10: custom categories

Custom categories are owner-scoped records in D1. They contain a name, optional icon token, and optional UI color token. They are managed at **Settings** and are available from the transaction details panel.

`transaction_category_overrides` stores a selected custom category separately from the imported transaction. `category_source_mappings` can assign one owner-defined display category to every transaction with the same preserved Monobank/MCC category code. Effective-category precedence is transaction override, source mapping, then imported category; resetting either layer removes only that separate record.

## API

- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/:categoryId`
- `DELETE /api/categories/:categoryId`
- `POST /api/categories/:categoryId/merge`
- `GET /api/category-sources`
- `PUT /api/category-sources/:sourceCode`
- `DELETE /api/category-sources/:sourceCode`
- `PUT /api/transactions/:transactionId/category`
- `DELETE /api/transactions/:transactionId/category`

All endpoints require the authenticated owner and mutation endpoints also require the existing same-origin protection. Merging atomically moves transaction overrides and imported type mappings to another owned category before deleting the source. A referenced category returns `409 category_referenced` on direct deletion; reset or reassign transaction overrides and imported type mappings first.
