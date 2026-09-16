# Mono Finance project rules

## Product

- Mono Finance is a private, single-user personal finance application.
- D1 is the source of truth. IndexedDB may only be an encrypted offline cache.
- Imported Monobank transactions are immutable source records.
- Corrections, exclusions, category overrides, and compensations must use separate records.
- Store and calculate money only in integer minor units; never use floating-point money.
- Never fabricate balances, transactions, recurring payments, categories, analytics, or account metadata for UI purposes.

## Architecture

- Browser communicates only with same-origin `/api/*`.
- Monobank integration, D1 access, secrets, and authentication stay in `worker/`.
- Frontend features belong in `src/features/<feature>/`.
- Shared frontend UI belongs in `src/components/`.
- Worker HTTP routes stay thin; business logic belongs in services and D1 access in repositories.
- Keep Monobank DTOs/provider-specific shapes inside `worker/monobank/`.
- API contract:
  - success: `{ data }`
  - failure: `{ error: { code, message } }`

## Security

- Never expose Monobank tokens, passwords, sessions, SQL errors, stack traces, upstream payloads, or secrets.
- Private API routes require authentication unless explicitly designed as public.
- Wrangler secrets must be used for sensitive bindings; do not store them in `vars`.

## Localization

- Supported UI locales are exactly `uk` and `en`.
- Every user-facing translation key must exist in both locales.
- No hardcoded user-facing strings in React components.
- Missing translation parity must fail `npm run i18n:check` and CI/build.
- Do not use fallback translations to hide missing keys.
- Language switching must update the UI immediately and persist across sessions.
- Chart titles, legends, tooltips, help text, empty states, validation messages, and dialogs are localized too.

## Design system

- Visual direction: premium, vivid, expressive, and visually memorable personal-finance UI; clean, compact, and information-dense without being visually sterile. Apple-inspired does not mean monochrome or desaturated.
- Prefer strong semantic color, colorful icons, richer chart palettes, tinted surfaces, layered hierarchy, and clear differentiation for categories, merchants, statuses, active navigation, important actions, and financial meaning. Keep large surfaces controlled so these elements retain contrast; do not globally desaturate the product.
- Reuse the existing theme tokens and shared components where appropriate, while allowing page-specific art direction when needed to reproduce a canonical reference.
- Use the system font stack; do not bundle Apple fonts.
- Form controls must inherit application typography; raw browser-looking selects are not acceptable.
- Prefer compact list/table rows over large cards for small records.
- Desktop actions such as Edit / Merge / Delete should be horizontal or moved into an overflow menu.
- Gradients, richer shadows, subtle glow, decorative background treatment, and illustrations are allowed when intentional and supported by a supplied canonical reference. Use them to strengthen hierarchy and visual identity without reducing readability, accessibility, or data clarity.
- Minimalism means removing unnecessary UI, not removing color or personality. Avoid generic admin-dashboard styling and large empty cards with little useful content.
- A supplied canonical reference takes precedence over legacy presentation and conservative stylistic defaults. When it is materially more colorful or expressive than the current app, reproduce that direction rather than averaging it with the legacy UI.
- All redesigned UI must work in both light and dark themes.

## Responsive layout

- `<768px` is the dedicated mobile layout breakpoint.
- Do not simply shrink the desktop layout below 768px.
- Mobile content uses a single-column composition where practical.
- Horizontal overflow is a bug; fix its source rather than hiding it with `overflow-x: hidden`.
- iOS PWA layouts must respect safe-area insets.
- Skip-to-content remains accessible but is visible only on intentional keyboard focus.

## Overview dashboard

- Default priority:
  1. KPI summary
  2. Recent transactions
  3. Income vs expenses
  4. Spending by category
  5. Spending by weekday
  6. Spending trend
  7. Longer-term analytics
- Primary KPIs:
  - Total spent
  - Total income
  - Net cash flow
  - Average spend / day
- `Available to save` and `Change vs previous period` are not primary default KPIs.
- Recent transactions must appear before analytics charts.
- Desktop dashboard widgets may be resized, reordered, hidden, and automatically packed.
- Do not refetch financial data merely because a widget moves or resizes.
- Mobile dashboard disables drag/resize when needed and keeps a single-column flow.

## Charts

- Income vs Expenses is a vertical grouped bar chart and defaults to a medium/half-width widget.
- Divide its selected period into at most 7 chronological buckets.
- Spending by Weekday always uses Monday → Sunday and must handle negative stored expense amounts correctly.
- Spending by Category prefers horizontal bars; donut/pie is optional when it duplicates the same information.
- Never show an empty coordinate system when no useful data exists; show a localized empty state.
- Financial metrics and chart titles use the shared contextual-help tooltip/popover.

## Categories / Accounts / Recurring payments / Settings

- Custom categories use compact rows, not one large card per category.
- Large MCC lists must be paginated.
- Account selection should use a proper dropdown/popover rather than native `<select multiple>`.
- Base currency must remain a compact setting, not a large standalone panel.
- Sync status belongs in a compact popover/settings section, not permanent dashboard space.
- Recurring payments use compact rows/table with status and next-payment information from real data only.

## Agent execution

- Load the relevant `.agents/skills` skill first.
- Search for the affected implementation before reading files.
- Read only affected files, immediate dependencies, shared components involved, and relevant tests.
- Frontend visual tasks must not inspect Worker/D1 unless the existing API contract requires it.
- Prefer one shared fix over repeated page-specific fixes.
- Do not implement unrelated issues discovered during the task.

## Validation

- UI copy/localization change: `npm run i18n:check`.
- Frontend change: `npm run typecheck` and `npm run lint`.
- Run targeted tests for behavior changes.
- Do not rerun the full validation suite after every edit.
- Run the production build only when shared infrastructure, localization infrastructure, routing, dependencies, or build configuration changed.
