# Frontend ownership

Phase 1 established these module boundaries without changing presentation.
Phase 2 redesigns Overview and its shared shell/control/chart foundation while
retaining route paths, API contracts, storage keys and financial semantics.

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
  exactly. Accounts retain en-US suffix output and Unicode minus; Overview,
  ledger and details use the selected UI locale. Phase 3 adds explicit income
  signs and a consistent minus in ledger/details. Numeric unknown currencies
  retain explicit minor units, localized in ledger/details.
- Date helpers use local midnight. Dashboard rejects incomplete custom ranges;
  ledger allows partial bounds. Both retain the existing fixed-second inclusive
  custom end. No UTC/local or DST contract migration is included.
- Feature query-key builders retain tuple identities. Transaction mutations now
  invalidate ledger, recent rows and shared analytics; compensation also refreshes
  its detail query. API functions keep their encrypted offline wrappers. Dashboard
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
and writes local screenshots under ignored `phase2.local/screenshots/`.

Phase 2 supplies the grid's visible resize affordance in dashboard.css. The
regression test exercises actual pointer resizing and dragging, persisted sizes
and order, and verifies that these interactions do not fetch financial data.

## Overview visual foundation (Phase 2)

- `app/AppShell` owns the compact branded mobile header and SVG navigation;
  mobile logout remains in More. Desktop retains its existing logout menu.
- `components/ui/Icon` owns the local SVG family. `Popover` handles contained
  help/detail panels, intentional dismissal and keyboard focus; mobile filter
  and chart-detail sheets reuse the existing native modal lifecycle. The modal
  lifecycle observes the visual viewport for software-keyboard clearance.
- `components/ui/ChartPrimitives` owns neutral scales, point details and a mobile
  data table. Overview widgets own series geometry and financial descriptions.
  Mobile uses a full-width details action instead of seven undersized targets.
- `dashboard-chart-presentation` owns exact integer ratios and chart date labels.
  Monetary amounts still use the shared exact formatter; amount input parsers
  and financial aggregations are unchanged. Zero marks stay zero; nonzero bars
  have a two-pixel visibility floor, with exact amounts in their details.
- Overview reuses the categories query/cache for saved icons and color choices.
  Supported custom appearances take priority over category-name inference and
  the merchant initial; unsupported tokens use the existing fallback. The
  transaction API shape and source records remain unchanged.
- `DashboardFilters`, `DashboardCustomization` and `DashboardLayout` compose the
  compact filters, named actions, row-count preference, four KPIs, recent rows
  and existing grid. Default category widget height accommodates available rows
  and stays at least as tall as income/expenses, keeping weekday before trend
  after grid packing. Saved widget dimensions and positions take precedence.
- Global foreground/surface tokens, neutral primitives, shell styles and scoped
  Overview styles retain distinct owners. Imports explicitly follow that order.
  The old layered Overview overrides have been replaced by one coherent sheet.

`overview-foundation.spec.ts` covers first-tap help, chart details, filter sheets,
contrast/touch targets, category expansion, loading/error recovery and long
synthetic names/amounts at 200% text scaling. State screenshots are written under
ignored `phase2.local/states/`; no financial screenshots are committed.

## Transactions and shared details (Phase 3)

- `TransactionFilters` composes full-width search, period/accounts, direction,
  and a labeled secondary filter popover/mobile sheet. Account options include
  masked card identity or the real account identifier when a card is unavailable.
  Shared multiselect Escape returns focus to its trigger.
- `useTransactionLedger` owns filter/query state. Criteria changes truncate only
  the matching cached cursor chain to its first page; loading more and mutations
  keep the current pages. Deferred search hides previous results while changing.
  `transaction-ledger-data` deduplicates cursor overlap without changing records.
- `TransactionLedger` and explicit row variants own desktop/mobile presentation.
  Category and account context remain separate. Very long amounts receive more
  row width; full imported description/MCC/account/original values remain in details.
  Date sums are labeled **Shown transactions total**, include only loaded effective
  values, and are omitted for mixed currencies/precision. They are not day-wide
  or analytics totals, even after the final cursor page.
- `TransactionDetailsSheet` remains the single Overview/ledger workflow. The
  native overlay is a full-height mobile view and contained desktop side panel.
  Summary and original bank information are separate from one active editor.
  `TransactionEditActions` in the detail section group owns sticky feedback,
  cancel and action presentation above the observed visual viewport boundary.
- `useTransactionDetails` owns drafts, validation and editor selection. Cancel
  discards a draft; closing the sheet discards unsaved drafts as before. Successful
  correction responses update selection; successful compensation responses update
  detail cache/flags and clear the incoming selection to prevent accidental repeats.
  `transaction-queries` owns ledger/recent/analytics invalidation without refetching
  unrelated accounts or category definitions.
- Transaction-specific visuals are limited to existing category appearance APIs;
  details links to Categories for these choices. No merchant editor or new API is
  invented. Source records, input parsers, date boundaries and encrypted offline
  wrappers remain unchanged.

`transactions-foundation.spec.ts` covers cursor overlap, retry/scroll retention,
cached-filter cursor reset, account/direction/custom date semantics, exact payloads,
failed-save drafts, reset/restore/unlink, focus return, pending submission guards,
offline display, touch targets, contrast and all required responsive widths in
both locales/themes. Synthetic normal/detail/state screenshots live only under
ignored `phase3.local/`. Software-keyboard clearance is tested with a reduced
viewport; physical iOS PWA verification remains manual.
