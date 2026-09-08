# Phase 10: custom categories

Custom categories are owner-scoped records in D1. They contain a name, optional icon token, and optional UI color token. They are managed at **Settings** and are available from the transaction details panel.

`transaction_category_overrides` stores a selected custom category separately from the imported transaction. The effective category is the override when present, otherwise the transaction's preserved Monobank/MCC category. Resetting an override removes only that separate record.

`category_source_mappings` assigns an immutable imported source code, such as MCC `5411`, to a custom category. It is resolved at read time, so the mapping applies to every matching existing and future transaction without updating imported rows. Effective-category precedence is:

1. per-transaction custom override;
2. global source-category mapping;
3. preserved imported Monobank/MCC category.

Mapping several source codes to the same custom category provides category consolidation. A custom-category merge atomically moves both transaction overrides and source mappings to the target category before deleting the source category.

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

All endpoints require the authenticated owner and mutation endpoints also require the existing same-origin protection. A referenced category returns `409 category_referenced` on deletion; reset/reassign its transaction overrides and source mappings, or merge it into another category first.

In **Settings → Bank categories**, create a readable custom category and assign one or more imported MCC rows to it. Selecting “Use imported name” resets only the mapping. The original source code/name remains visible in transaction details for traceability.
