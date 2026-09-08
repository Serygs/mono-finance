# Spec: Category lifecycle and source mappings

## Objective

Let the owner replace opaque imported labels such as `MCC 5411` with an understandable effective category across all matching existing and future transactions. Preserve every imported category field, retain per-transaction overrides, and allow multiple source/custom categories to be consolidated safely.

## Tech stack and commands

- Cloudflare D1 migration and parameterized repository queries.
- Hono Worker routes/services and React with TanStack Query.
- Verify with `npm test -- --run`, `npm run lint`, `npm run typecheck`, and `npm run build`.

## Project structure

- `migrations/`: additive source-category mapping table.
- `worker/repositories/`, `worker/services/`, `worker/routes/`: persistence, precedence, validation, and authenticated API mapping.
- `src/features/categories/`: source mapping and merge controls in Settings.
- `docs/phase-10-custom-categories.md`: data model, precedence, API, and migration behavior.

## Code style

Effective-category precedence is explicit and shared by query projections:

```ts
const effectiveCategory =
  transactionOverride ?? sourceCategoryMapping ?? originalCategory
```

All D1 values are bound parameters; imported transaction columns are never updated.

## Testing strategy

- Migration tests prove uniqueness, indexes, and restrictive foreign keys.
- Service tests prove precedence, global mapping behavior, deletion guards, and atomic merge intent.
- API tests prove authenticated mapping/merge contracts and safe validation errors.
- Existing transaction and analytics tests protect their public response shapes and calculations.

## Boundaries

- Always: apply mappings by owner and immutable source code; invalidate transaction and dashboard queries after changes.
- Ask first: changing imported categories or introducing merchant-text automation.
- Never: update `transactions.original_category_*`, silently overwrite per-transaction overrides, or expose D1 details.

## Success criteria

- The owner can map `MCC 5411` to a named custom category in Settings.
- All matching existing and future transactions use that category unless a transaction-specific override exists.
- Analytics and transaction filters use the same effective category.
- Multiple MCC sources can map to one category.
- Merging custom categories reassigns mappings and transaction overrides before deleting the source.
- Resetting a source mapping restores the immutable imported category display.

## Open questions

None. The user confirmed that source-level renaming must inherit across all transactions of the same MCC/type.
