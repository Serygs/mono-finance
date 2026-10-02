# Frontend ownership

Phase 1 preserves the current layouts, route paths, translations, API contracts,
storage keys and financial semantics. UI redesign is a separate phase.

| Responsibility                          | Before                           | After                                                                                |
| --------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------ |
| Legacy hash dispatch                    | DashboardPage / SettingsPage     | `app/LegacyPageRoutes.tsx`                                                           |
| Overview orchestration                  | DashboardPage                    | DashboardPage + filter/query/sync/preference hooks                                   |
| Desktop grid / mobile flow              | DashboardPage                    | DashboardLayout + widget registry/configuration                                      |
| KPI, recent rows, charts, evidence      | DashboardPage                    | `features/dashboard/widgets/`                                                        |
| Ledger, filters, selected item          | TransactionsPage                 | TransactionFilters, TransactionLedger, useTransactionLedger, useTransactionSelection |
| Transaction corrections / relationships | TransactionDetails               | Detail sections + useTransactionDetails / useTransactionMutations                    |
| Detail overlay                          | Ledger only                      | TransactionDetailsSheet shared by ledger and recent Overview rows                    |
| Categories route composition            | SettingsPage                     | CategoriesPage                                                                       |
| Category CRUD / source mapping          | CategoryManagement               | useCategoryManagement / CategoryManagement, separate CategorySourceManagement        |
| Category ranking transform              | dashboard-data                   | category-analytics-data                                                              |
| Money and equivalent date presentation  | Per-screen formatters            | `lib/money-presentation`, `lib/date-presentation` with compatibility adapters        |
| Styles                                  | Overlapping global screen sheets | Base, app, UI and adjacent feature sheets                                            |

## Actual structure

- `src/app/`: router, legacy hash adapters, shell and navigation styles.
- `src/components/ui/`: neutral controls, surfaces, feedback, overlays and the
  shared native-modal lifecycle. Small related primitive groups stay together.
- `src/lib/`: API client and exact money/local date presentation utilities.
- `src/features/dashboard/`: Overview composition, filters, queries, sync,
  widget preferences/configuration/registry, customization; `widgets/` owns
  KPI, recent, chart and evidence presentation. Pure chart transforms remain in
  dashboard-data. Financial queries do not depend on layout or visibility.
- `src/features/transactions/`: ledger queries/filters, explicit ledger and recent
  row presentations, selection, one details sheet, detail sections and mutation
  hooks. Amount input parsing/editing remains separate from display formatting.
- `src/features/categories/`: CategoriesPage, category CRUD, appearance choices,
  source mappings, ranking and filtering helpers.
- `src/features/accounts/`: AccountsPage, AccountPicker, shared accounts query,
  account summaries and compatibility formatting.
- `src/features/settings/`: SettingsPage and settings sections, currency and sync
  preferences. Hash dispatch is outside the page; logout behavior is unchanged.
- Tests and feature styles live next to their owners. Browser scenarios and
  synthetic API fixtures live in `tests/e2e/`.

## CSS cascade

`src/main.tsx` loads global tokens/reset/typography, then shared primitives and
app styles, then feature styles. `screen-layouts.css` and the overriding global
page sheets are removed. Each selector now lives with its owner. Existing
responsive and theme rules stay in that sheet; more specific contextual rules
remain intentional, rather than a second stylesheet overriding the first.
Superseded declarations and selectors for unused legacy markup were removed.
The shared form-action layout is `ui-form-actions`.

## Compatibility boundaries

- Money formatting divides bigint integer minor units and formats the remainder
  exactly. Accounts retain en-US suffix output and Unicode minus; ledger/details
  retain the browser locale's currency-code placement; dashboard retains the
  selected UI locale. Numeric unknown currencies retain explicit minor units.
- Date helpers use local midnight. Dashboard rejects incomplete custom ranges;
  ledger allows partial bounds. Both retain the existing fixed-second inclusive
  custom end. No UTC/local or DST contract migration is included.
- Feature query-key builders retain tuple identities and existing invalidation
  boundaries. API functions keep their encrypted offline wrappers. Dashboard
  reuses the accounts cache rather than maintaining separate manual fetch state.
- Category visual resolution retains its existing name normalization and token
  matching. The current transaction contract has no merchant/custom-asset fields;
  this phase does not extend that contract or replace category appearance choices.
- `/#accounts` and `/settings#categories` render in place, retaining query/hash
  state and browser history. No redirect or URL migration is introduced.

## Validation

Run `npm run typecheck`, `npm run lint`, targeted frontend unit tests,
`npm run test:e2e`, and `npm run build` for shared/routing changes.
The repository's localization check is `npm run i18n:check`.
The layout regression captures synthetic fixtures at 390/1440 px in both themes,
checks all five destinations in uk/en at 320, 375, 390, 430, 768, 1200 and 1440 px,
and writes local screenshots under ignored `phase1.local/after/`.

Baseline limitation: the existing desktop resize span has zero rendered size
because the grid's handle stylesheet was not loaded. The regression test covers
resize events and persisted dimensions through that span's event handler, plus
actual pointer dragging. Adding a visible resize affordance is deferred to the
visual phase so Phase 1 does not change the layout/art direction.
