# Proposed title

Improve financial UI readability, filter traceability and verified freshness

# Proposed description

Selected theme labels could lose contrast on hover, ordinary account rows exposed technical IDs without a card number, and category bars used a different denominator from their percentages. Additional filters and resets obscured the active financial context, and analytics lacked direct contributor navigation and verified balance/history freshness.

This change preserves the compact design and five-item navigation while making ledger metadata concise, selected controls readable, additional criteria removable and resets scoped. Category widths now match full-currency shares. KPI help explains current effective cash-flow calculations; exact-identity drill-down preserves dates/accounts/currency/direction/exclusion across server cursor pages and restores context/scroll on return. Converted totals show the original-ledger limitation. Default recent limit 5 and saved limits 10/20 remain intact; widget movement/resizing does not refetch financial data.

Additive API fields distinguish successfully persisted balance snapshots from transaction synchronization and successful statement intervals. Legacy or missing evidence stays unknown; disjoint intervals retain gaps. Immutable source records, correction/category/compensation precedence, money formulas, authentication, same-origin API envelopes and encrypted-cache boundaries remain intact. Phase 4 financial/synchronization proposals and the phase 5 backlog are documents only.

## Validation

- i18n parity (501 uk/en keys), typecheck, lint and touched-file formatting pass.
- Vitest: 258 tests in 73 files pass, including SQLite persistence/rollback, pagination and compatible analytics consistency.
- 55 distinct targeted Chromium scenarios verified across runs/reruns; responsive/theme/locale matrices and 200% text pass, alongside large amounts, offline/error/loading, focus/Escape and rendered contrast checks.
- Production build, client-bundle boundary check and diff whitespace check pass.
- Synthetic local artifacts and the full audit/validation matrix are described in `docs/ui-ux/trust-and-density-review.md`.

Apply migration `0008_verified_data_freshness.sql` before the Worker release. Physical iOS/PWA/VoiceOver, live provider ingestion and remote D1 migration were not exercised. No deployment or branch publication is included.
