# Capability Map: Transaction organization and insights

## Current repository baseline

- Custom categories can already be renamed through `PUT /api/categories/:categoryId` and the category management UI.
- Imported Monobank/MCC category fields remain immutable; effective category names are separate user-owned metadata.
- Hiding a transaction from statistics already exists as a reversible transaction exclusion. This initiative reuses that model rather than introducing a second flag.

## Modules

| Module id                 | Responsibility                                                                                                                                                                                   | Depends on                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `localization-foundation` | Add UA/EN UI localization, a language switcher, locale-aware dates/numbers, and a persisted browser preference without changing API contracts.                                                   | -                                                                        |
| `category-lifecycle`      | Keep custom-category rename, add global source-category mappings for MCC/Monobank categories, and add an atomic merge that moves overrides and mappings while preserving imported category data. | -                                                                        |
| `transaction-tags`        | Add user-managed tags, many-to-many transaction tagging, tag CRUD/assignment, transaction-list filtering, and tag display in transaction details.                                                | `localization-foundation`                                                |
| `analytics-visibility`    | Reuse transaction exclusions as the sole reversible hidden-from-analytics mechanism and make the action/state/filter terminology clear in both locales.                                          | `localization-foundation`                                                |
| `subscription-detection`  | Deterministically identify recurring expenses by normalized merchant, cadence, amount tolerance, and currency; support confirmation/dismissal and subscription filtering.                        | `transaction-tags`, `category-lifecycle`                                 |
| `anomaly-detection`       | Deterministically flag unusual expenses against comparable merchant/category history, separated by currency and without mutating transactions.                                                   | `category-lifecycle`                                                     |
| `dashboard-customization` | Configure chart visibility, order, metric, grouping, and chart-appropriate options while retaining accessible data alternatives and exact API totals.                                            | `localization-foundation`, `subscription-detection`, `anomaly-detection` |

## Build order

1. `localization-foundation` and `category-lifecycle`.
2. `transaction-tags` and `analytics-visibility`.
3. `subscription-detection` and `anomaly-detection`.
4. `dashboard-customization`.

## Architectural assumptions

1. Rename includes assigning a user-facing custom category to an immutable Monobank/MCC source such as `5411`. It applies to every existing and future transaction with that source code.
2. Merge means mapping multiple Monobank/MCC sources to one custom category or merging one custom category into another. Every transaction override and source mapping moves to the target before the source is deleted.
3. Tags are user-managed metadata stored separately from imported transactions. A transaction can have multiple tags, and tags can filter the transaction list.
4. Apple Music and YouTube Music are representative tag/subscription labels, not hard-coded provider integrations.
5. Subscription and anomaly detection are deterministic and explainable, use D1 history only, do not use an LLM, and never silently mutate user data.
6. Hidden is the existing exclusion state: hidden transactions remain browseable and restorable but are omitted from normal analytics.
7. UA is the default locale for a new browser profile; the chosen UA/EN locale is stored locally and is not sensitive financial data.
8. Dashboard configuration is a presentation preference. Initial preferences can be browser-local and versioned; financial aggregates remain server-computed and D1-backed.

## Cross-module invariants

- Original Monobank transaction fields are never updated.
- Money remains integer minor units, and analytics never mix currencies without reproducible conversion.
- All new private APIs use the existing authentication, same-origin mutation protection, no-store response policy, validation, and safe error contract.
- Detection results are suggestions until the user explicitly confirms or dismisses them.
- New UI is mobile-first, keyboard accessible, translated in UA and EN, and safe for encrypted offline caching rules.
