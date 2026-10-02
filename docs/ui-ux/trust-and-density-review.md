# UI/UX trust and density iteration

Baseline: `5de350f80405cd4fb7e7718dba062ee1f5e25b86` (`main`). Clean checkout; branch `feat/ui-ux-trust-and-density`. No provided screenshots are accessible in this session; repository reference images were removed for provenance. Use synthetic test data for artifacts.

## Phase 0 matrix

| Problem                   | Confirmed state                                                                                                                    | Change                                                                                       | Verification                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Selected theme disappears | Shared hover selector has greater specificity than selected foreground                                                             | Semantic selected foreground/background; restrict unselected hover                           | Computed button and label contrast across themes and states            |
| UUID in ordinary lists    | accountLabel, AccountPicker, AccountRow expose ID without PAN                                                                      | Shared type/currency/card formatting, localized fallback                                     | No ID in visible text or accessible names; identity stays in values    |
| Ledger density            | Separate category/account/time grid rows on mobile                                                                                 | Single wrapping secondary line; keep indicators and details                                  | 320–1440, large text/amounts/names                                     |
| Long bank category        | Original MCC name shown verbatim                                                                                                   | Explicit stable-code display labels; preserve custom/mapped names                            | Ambiguous MCC unchanged; identity/grouping unchanged                   |
| Icons                     | Custom category appearance → inferred category icon → initial already exists                                                       | Preserve existing mechanism; no external logo service                                        | Custom appearance test                                                 |
| Hidden filters/reset      | Counters include base criteria; transaction/category reset clears base context                                                     | Count additional criteria only; chips; scoped reset                                          | Remove one, preserve dates/accounts/search/direction                   |
| Category bar scale        | Bar divides by largest, text by all-category total                                                                                 | Both divide by full currency total                                                           | 38.9%, zero, other, multiple currencies                                |
| KPI help                  | Shared Popover already supports tap/hover/focus/Escape                                                                             | Visible info affordance; verified financial explanation                                      | Existing help suite + formula/domain tests                             |
| Analytics consistency     | Same service/resolved dataset, effective values, exclusions                                                                        | Expose original currency mode and exclusion policy; controlled consistency test              | Domain overview vs category totals                                     |
| Recent list               | Default is 5; 10/20 saved preferences respected; KPI before recent before charts                                                   | Shorten action copy; preserve preference/layout query ownership                              | Existing preference and no-refetch tests                               |
| Freshness                 | Transaction lastSuccessfulSyncAt exists; balance time/coverage absent                                                              | Minimal persisted verified metadata; shared details and compact analytics trigger            | Failure/no-op never advances timestamp; unknown coverage stays unknown |
| Drill-down                | Transaction endpoint filters category name exactly, lacks ID/null identity; analytics original direction retained after adjustment | Add backward-compatible exact category identity; typed adapter; preserve URL/history context | Server query + cursor pagination + back navigation                     |

## Scope boundaries

No financial reclassification, automatic transfer detection, new conversion formula, account debt formula, webhook architecture, deployment, push or PR publication. Phase 4 is a separate proposal; phase 5 stays backlog. Existing imported records and saved dashboard preferences remain unchanged.

## Delivered behavior and existing capabilities

Phases 0–3 are implemented. Selected segments retain a contrast pair through hover/focus/active/disabled states. Ordinary account labels use supplied type, currency and last four card digits; source IDs remain selection/query identities. Ledger metadata wraps into a compact secondary line, while the full merchant/category description and Adjusted/Compensated/Excluded states remain accessible. Short category labels apply only to an explicit bank identity map; owner mappings and overrides retain their names. Category tracks and displayed percentages share the complete per-currency denominator, including categories outside the first five.

Additional-filter counters/chips and scoped reset preserve the period, accounts, visible direction and search. Analytics exposes original/converted mode, effective amounts, exclusion policy and exact period boundaries. KPI help uses the existing popover/sheet with a visible information icon and describes actual compensation, refund, transfer/credit and daily-average behavior. Separate category/KPI links use typed contributor filters and server-side identity queries across cursor pages. Returning restores filters and scroll; layout changes do not refetch financial queries.

Default recent limit 5, saved limits 10/20, category visual customization, five navigation destinations and contextual-help focus/Escape behavior already existed and were retained. No overview/category formula discrepancy was reproduced on the controlled compatible dataset, including an adjustment and exclusion. Screenshot-specific discrepancies cannot be attributed without their actual dataset/context; no amount from the audit was embedded in code or tests.

Freshness details now separate account availability, confirmed balance snapshot time, transaction synchronization status, verified import-window times, per-account history coverage and online/offline state. Unknown evidence remains unknown; gaps and failed synchronization receive compact visible warnings. See [phase-3-api-contracts.md](phase-3-api-contracts.md) for the additive contracts and exact semantics.

## Validation

Completed on synthetic data in Chromium:

- `npm run i18n:check`: 501 keys in both uk/en.
- `npm run typecheck`, `npm run lint`: pass.
- `npm run test`: 258 tests in 73 files pass, including SQLite persistence, exact identity pagination, adjusted/excluded analytics consistency, interval rollback/gaps, presentation fallbacks and saved preferences.
- 55 distinct focused Playwright scenarios in seven suites passed across the main run and corrected/targeted reruns: accounts, categories, overview, transactions, settings, contextual-help, trust-and-density. The initial run exposed defects and outdated expectations; all those failures were corrected and their scenarios rerun successfully. This count is not a claim that a single final command ran all 55 together.
- The trust-and-density suite plus transaction suite passed 14 scenarios together; the added drag/resize/preferences scenario passed separately; the final settings suite passed all 8 scenarios.
- Matrices cover 1440, 1200, 768, 430, 390, 375 and 320px; light/dark; uk/en; doubled text; long names; additional suites cover exact large amounts, loading, empty/error/offline, sheets, focus/Escape and keyboard-sized viewports. No horizontal page overflow was detected in those cases.
- Rendered/computed colors were measured for selected button and nested-label contrast in default/hover/keyboard focus-visible/active/disabled states (at least 4.5:1). Existing foreground/chart/control checks also passed. These are automated checks of exercised elements, not a full WCAG conformance declaration.
- Touched TS/TSX/CSS/Markdown files pass Prettier; `git diff --check` passes.
- `npm run build` and `npm run security:client-bundle` pass. Build reports an application chunk-size warning; no dependency or bundling policy was changed.

Not performed: VoiceOver, physical iOS/PWA/virtual-keyboard testing, live Monobank ingestion, or remote D1 migration. For manual iOS review: install the PWA, switch both themes/languages, open the last ledger row above the safe-area navigation, enlarge text, open a sheet and its keyboard, traverse/close it with VoiceOver, and check specific chip removal/focus return. Live provider and deployment checks are separate from mocked UI/SQLite validation.

## Synthetic artifacts

Local, gitignored artifacts are under `phase-trust.local/screenshots/`:

- `theme-before-dark-hover.png` reproduces the previous hover-specificity rule on the synthetic current fixture; it is a labeled defect reproduction, not a claimed full baseline screenshot.
- `theme-after-light.png`, `theme-after-dark.png` show the corrected state.
- `overview`, `transactions`, `categories`, `accounts`, `settings` screenshots at 390/1440 in both themes show the resulting composition.
- Existing focused suites also generate synthetic large-text/amount and overlay artifacts under their gitignored `phase*.local/screenshots/` directories.

No real financial screenshots or screenshot-derived merchant/account/amount fixtures were added to the repository.

## Review and release considerations

Apply additive migration `0008_verified_data_freshness.sql` before deploying the Worker that reads its fields/table. This work creates the migration but does not apply it to remote D1, merge, push or deploy. Legacy metadata stays unknown and frontend fields are backward compatible.

Converted aggregates intentionally have no purported exact original-currency ledger link; their limitation is visible. No arbitrary freshness-age threshold is invented. Long-term interval compaction/repair/backfill orchestration and new financial classifications remain proposed phase 4 work, documented in [phase-4-financial-semantics.md](phase-4-financial-semantics.md). The seven product proposals stay in [phase-5-backlog.md](phase-5-backlog.md).

Local implementation commits:

- `311ec93` — `fix(ui): improve themed controls and compact financial labels`
- `9d2d96a` — `feat(api): persist verified freshness and query exact category identities`
- `824413f` — `feat(analytics): expose scoped filters, traceable drill-down and freshness`
- `c1cdd44` — `fix(categories): preserve zero shares and accessible link targets`
- `f149680` — `fix(filters): retain category labels for empty drill-down results`

The documentation handoff is recorded separately. The final verification commit additionally asserts keyboard `:focus-visible` before measuring segment contrast.
