# Spec: Category Source Labels

## Objective

Let the owner replace labels such as `MCC 5411` with a custom category for every current and future transaction carrying that immutable source category code.

## Data Model

`category_source_mappings` stores one `(user_id, original_category_code) → category_id` relationship. Effective-category precedence is transaction override → source mapping → imported category.

## Testing Strategy

Cover migration constraints, service validation, authenticated routes, transaction projection, analytics projection, and the Settings workflow.

## Boundaries

- Never update `transactions.original_category_code` or `transactions.original_category_name`.
- Use parameterized D1 statements and owner-scoped mappings.
- Reset removes only the mapping.

## Success Criteria

- Settings lists imported MCC categories and their transaction counts.
- Applying a custom category changes transaction browsing and analytics consistently.
- A transaction-specific override remains higher priority.
