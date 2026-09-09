# Capability Map: Dashboard Personalization

| Module id                    | Responsibility                                                                                                 | Depends on                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `localization-foundation`    | One React provider for English/Ukrainian copy, locale persistence, document language, and localized formatting | —                                                   |
| `category-source-labels`     | Map an immutable imported MCC category to a user-owned display category for all matching transactions          | —                                                   |
| `category-chart-exploration` | Filter visible expense categories and coordinate donut hover/focus with its legend                             | `localization-foundation`, `category-source-labels` |

Build order: `localization-foundation` and `category-source-labels` → `category-chart-exploration`.

The phrase “transaction type” is interpreted as the MCC-derived category shown in the supplied screenshot. Original Monobank category fields remain immutable; only the effective display/analytics category changes.
