---
name: mono-finance-ui
description: Project-specific UI/UX rules and implementation workflow for Mono Finance. Use for redesigns, responsive/mobile work, dashboard widgets, charts, shared controls, accessibility, localization-aware UI, and visual polishing.
---

# Mono Finance UI skill

Use this skill for frontend visual/design work in Mono Finance.

`AGENTS.md` remains the project contract for product, architecture, security, localization, and validation.  
This skill defines the UI/UX system and the implementation workflow for visual tasks.


## Canonical visual references

Before changing a page, open `REFERENCE_INDEX.md` and inspect the exact desktop/mobile references for that page.

### Desktop
- `references/desktop/overview.jpg`
- `references/desktop/transactions.jpg`
- `references/desktop/categories.jpg`
- `references/desktop/accounts.jpg`
- `references/desktop/settings.jpg`

### Mobile
- `references/mobile/overview.jpg`
- `references/mobile/transactions.jpg`
- `references/mobile/categories.jpg`
- `references/mobile/accounts.jpg`
- `references/mobile/settings.jpg`

These references are the primary visual source of truth, not loose inspiration.

Reference mapping:
- Overview / Огляд → `overview.jpg`
- Transactions / Транзакції → `transactions.jpg`
- Categories / Категорії → `categories.jpg`
- Accounts / Рахунки → `accounts.jpg`
- Settings / налаштування → `settings.jpg`

For each page, match the corresponding desktop/mobile references as closely as practical in:
- composition;
- hierarchy;
- spacing;
- density;
- typography scale;
- card proportions;
- toolbar/filter structure;
- tables/lists;
- chart/widget proportions;
- navigation;
- icon sizing;
- borders and shadows;
- responsive behavior.

Preserve real Mono Finance data, APIs, routing, calculations, auth and i18n.

Do not preserve legacy presentation merely because it already works.

If current markup, layout, CSS, or components conflict with the matching reference, replace them.

The current UI is a behavior/data source, not a visual source of truth.

Do not copy fake balances, fake transactions, generated text mistakes, or unsupported actions from reference images.

Desktop and mobile are separate intentional compositions.

For `<768px`, use the matching mobile reference instead of shrinking the desktop implementation.

Before declaring a page complete:
1. compare desktop at 1440px against its desktop reference;
2. compare mobile at 390px against its mobile reference;
3. continue iterating if the implementation still visually resembles the legacy UI more than the reference.

## 1. Core product design direction

Mono Finance is a personal-finance product, not a generic admin panel.

Target character:
- Apple-inspired, but not a pixel copy of Apple;
- calm, premium, minimal;
- information-dense without feeling crowded;
- compact where data is simple;
- visually consistent across Overview, Categories, Settings, Accounts, Recurring Payments, Transactions, and Analytics;
- optimized for frequent daily use;
- light and dark theme ready.

Avoid:
- Bootstrap/admin-dashboard aesthetics;
- oversized cards with little information;
- strong shadows;
- excessive glassmorphism;
- decorative gradients without functional value;
- duplicated controls/styles per page;
- fake financial data or fictional actions added only because they appear in a reference image.

Reference images define visual direction only. Existing data, routing, and business logic remain authoritative.

---

## 2. Typography

Use the application/system font stack:

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "SF Pro Text",
  "SF Pro Display",
  "Inter",
  "Segoe UI",
  sans-serif;
```

Do not bundle Apple proprietary font files.

Target hierarchy:

- Page title: 32–36px desktop, 26–30px mobile, weight 700.
- Section title: 18–22px, weight 650–700.
- Widget/card title: 14–16px, weight 600.
- Body: 14–15px.
- Secondary text: 12–13px.
- Labels: 12–13px, weight 500–600.
- Buttons: 13–14px, weight 550–600.
- Financial values: 18–24px where important; use tabular numbers when supported.

All form controls must inherit app typography. Prefer shared rules such as:

```css
input,
select,
textarea,
button {
  font: inherit;
}
```

Do not leave browser-default typography in native controls.

---

## 3. Color, surfaces, depth

Reuse existing theme tokens first.

Light-theme direction:
- soft gray page background;
- white primary surfaces;
- subtle secondary surfaces;
- neutral near-black primary text;
- muted gray secondary text;
- restrained application blue as primary accent;
- soft green/orange/red states.

Dark mode:
- use layered dark surfaces;
- keep muted text readable;
- preserve subtle borders;
- avoid simple inversion.

Normal expenses are not errors. Do not overuse destructive red for ordinary spending.

Surface defaults:
- outer cards: ~16–20px radius;
- nested controls: ~10–12px radius;
- 1px subtle border;
- soft or no shadow;
- use spacing/background/border before shadow to establish hierarchy.

---

## 4. Spacing and density

Use a consistent spacing scale based on:

`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48`

Typical:
- desktop page horizontal padding: 24–32px;
- mobile horizontal padding: 16px;
- card padding: 16–24px;
- compact row vertical padding: 12–16px.

Do not use fixed heights unless the content requires them.

Do not leave large empty areas below short sections.

Prefer compact rows/tables for small records instead of giant per-item cards.

---

## 5. Shared UI primitives

Before adding page-specific UI, search for existing shared primitives.

Reuse or create shared versions for recurring patterns:
- PageHeader;
- SectionCard / Surface;
- Button;
- Input;
- Select / Dropdown;
- MultiSelect;
- Popover;
- Dialog;
- Tooltip;
- contextual InfoTooltip;
- StatusBadge;
- SegmentedControl;
- CompactTable;
- SearchField;
- EmptyState;
- Skeleton;
- OverflowMenu / ActionMenu.

Do not solve the same typography, radius, spacing, focus, or dropdown issue independently on several pages.

If the same fix appears in two or more pages, prefer a shared component/style.

---

## 6. Buttons and controls

Desktop button target height: ~36–42px.  
Mobile touch control target: ~44–48px.

Button hierarchy:
- Primary: application accent, high-contrast text.
- Secondary: surface + subtle border.
- Destructive: restrained red treatment only for destructive actions.

Every control must provide:
- default;
- hover where applicable;
- `:focus-visible`;
- active;
- disabled.

Do not remove focus outlines without an accessible replacement.

### Dropdowns / multi-selects

Product-facing selectors must look like part of the design system.

Avoid exposing raw `<select multiple>` for Accounts/Categories when a dropdown/popover with checkboxes can reuse existing primitives.

Dropdowns/popovers must stay within viewport bounds on mobile.

---

## 7. Desktop and mobile are different compositions

This is a strict project rule:

**Desktop and mobile are two compositions of the same product, not the same layout at different widths.**

Breakpoints:
- `>=1200px`: full desktop.
- `768–1199px`: compact desktop/tablet.
- `<768px`: dedicated mobile composition.

Do not finish a redesign by merely adding `flex-wrap` and smaller fonts.

### Mobile defaults

At `<768px`:
- prefer one-column content flow;
- use 16px page padding;
- avoid horizontal tables when card rows are clearer;
- keep touch targets large enough;
- keep popovers inside viewport;
- disable desktop-only drag/resize interactions when appropriate;
- respect iOS safe areas;
- bottom navigation must not cover content;
- preserve important information hierarchy even when layout changes.

Test at:
- 1440px;
- 1200px;
- 768px;
- 430px;
- 390px;
- 375px;
- 320px.

Never consider a visual redesign complete after checking desktop only.

---

## 8. Horizontal overflow

Horizontal overflow is always a bug unless explicitly required.

Fix the source rather than hiding it.

Inspect:
- fixed widths;
- `min-width`;
- `100vw`;
- negative margins;
- transforms;
- absolute positioning;
- oversized grid children;
- native controls;
- chart/container minimum widths.

Do not use `overflow-x: hidden` as the primary fix.

---

## 9. PWA / iOS behavior

Mono Finance is used as an iOS PWA.

Respect:
```css
env(safe-area-inset-top)
env(safe-area-inset-bottom)
```

Ensure:
- fixed/sticky navigation respects safe areas;
- content has enough bottom padding;
- standalone mode does not shift header/content;
- skip-to-content remains accessible but hidden until intentional keyboard focus;
- use `:focus-visible` rather than arbitrary startup focus when possible.

---

## 10. Motion

Use subtle, native-like motion.

Typical durations:
- hover: 120–160ms;
- tooltip: 120–180ms;
- popover/dialog: 160–220ms;
- card/surface transition: 180–250ms.

Suggested easing:
`cubic-bezier(0.2, 0.8, 0.2, 1)`

Prefer:
- opacity;
- small translate;
- subtle scale.

Avoid:
- bounce;
- strong spring effects;
- continuous decorative animation;
- layout-heavy animation.

Respect `prefers-reduced-motion`.

---

## 11. Overview dashboard rules

Overview is the main daily-use screen.

Default information priority:
1. KPI summary.
2. Recent transactions.
3. Income vs Expenses.
4. Spending by Category.
5. Spending by Weekday.
6. Spending Trend.
7. Longer-term analytics.

Primary KPIs:
- Total spent;
- Total income;
- Net cash flow;
- Average spend/day.

Do not make these primary defaults:
- Available to save;
- Change vs previous period.

Recent transactions appear before charts.

### Dashboard widgets

Reuse the existing widget/grid implementation.

Desktop widgets may support:
- resize;
- reorder;
- visibility toggle;
- auto-packing;
- persistence.

If two medium widgets fit in a row, pack them together.

Moving/resizing must not refetch transaction/account data.

At `<768px`:
- use single-column widget flow;
- disable drag/resize if appropriate;
- keep visibility/order preferences.

---

## 12. Chart rules

Every chart must:
- resize with its widget;
- support light/dark themes;
- localize title, legend, axis labels, tooltip labels, empty states;
- use localized currency/date formatting;
- show a real empty state when there is no useful data.

Never leave a blank coordinate system that looks broken.

Use the shared contextual-help component for chart titles when explanation is useful.

### Income vs Expenses

- Vertical grouped bar chart.
- Default desktop size: medium / approximately half-width.
- Maximum ~7 chronological buckets for the selected period.
- Each bucket aggregates income and expenses.
- Visible localized legend.
- Tooltip: bucket/date range, income, expenses, net cash flow.
- Avoid very thin bars and unused width.

Suggested bucketing:
- 7 days → daily;
- 30 days → ~7 ranges;
- 90 days → ~7 ranges;
- custom → up to 7 equal chronological ranges.

### Spending by Weekday

- Monday → Sunday.
- Handle stored negative expense values correctly.
- Display positive visual magnitudes.
- Tooltip includes weekday, total spending, transaction count.
- If expense data exists but chart is flat, investigate aggregation/filtering rather than hiding it.

### Spending by Category

Prefer horizontal bars for ranking/comparison.

Sort descending unless existing product behavior requires another order.

Donut/pie should be optional when it duplicates the same information.

### Spending Trend

Use line/area chart and adapt aggregation to selected period.

Avoid too many x-axis labels.

### Monthly Trend

Show only when useful historical data exists; otherwise use an insufficient-data state.

---

## 13. Financial explanations

Important financial numbers should be explainable.

Use one shared InfoTooltip/Popover component.

Desktop:
- hover and keyboard focus.

Mobile:
- tap.

At minimum provide explanations for:
- Total spent;
- Total income;
- Net cash flow;
- Average spend/day;
- Recent transactions;
- Income vs Expenses;
- Spending by Category;
- Spending by Weekday;
- Spending Trend;
- Monthly Trend;
- Top Merchants;
- Recurring Expenses;
- Fixed vs Variable Expenses;
- Largest Transactions;
- Recent Corrections;
- Recent Compensations.

All help copy must use i18n.

---

## 14. Categories

Custom categories use compact rows/list/table.

Desktop:
`[icon/color] Name ... [Edit] [Merge] [Delete/⋯]`

Actions should be horizontal.

If space is limited:
`[Edit] [Merge] [⋯]`

Do not stack Edit/Merge/Delete vertically on desktop.

Mobile may wrap actions once if necessary.

Large MCC lists must be paginated.

Search/filter applies to the logical full dataset, not only the visible page.

---

## 15. Settings

Settings should resemble compact native settings, not dashboard cards.

Base currency must be a compact row, not a large standalone panel.

Language and theme controls should be compact.

Sync status belongs in a compact section/popover, not permanent dashboard space.

Group only settings that actually exist.

Do not invent preferences from a reference image.

---

## 16. Accounts

Use compact account cards/rows.

Show only real data available in the app:
- account name;
- masked number if available;
- currency;
- balance;
- type;
- sync status/time;
- supported actions.

Do not invent balance-history graphs or unsupported account actions.

Mobile account cards may switch to a vertical composition.

---

## 17. Recurring Payments

Prefer compact table/list presentation.

Desktop fields where supported:
- name;
- amount;
- frequency;
- next payment;
- status;
- actions.

Use subtle status pills.

Do not invent automatic payment execution.

Do not normalize irregular/annual payments into misleading monthly values unless semantics are already defined.

---

## 18. Loading and empty states

Prefer skeleton cards/rows or compact inline loading.

Avoid full-page spinners for normal data loading.

Empty states should:
- explain the state;
- remain compact;
- show a relevant action only if supported;
- use existing icons rather than large illustrations.

Prevent major layout shifts between loading and loaded states.

---

## 19. Localization-aware UI

This skill assumes `AGENTS.md` strict `uk`/`en` parity.

For any visible UI introduced here:
- use translation keys;
- provide both locales;
- localize chart labels/tooltips;
- localize empty/loading/help text;
- do not hide missing keys with fallback.

Do not translate technical identifiers unless they are intentionally presented as localized UI.

---

## 20. Reference-image workflow

When a screenshot/mockup is attached:

1. Extract:
   - hierarchy;
   - spacing;
   - density;
   - card/list proportions;
   - color restraint;
   - control style;
   - layout balance.

2. Compare against existing project primitives.

3. Implement only what is compatible with current product behavior.

4. Do not copy:
   - fake balances;
   - fake transactions;
   - fictional menu items;
   - unsupported actions;
   - visual demo text as real product copy.

5. Preserve real Mono Finance data/contracts.

---

## 21. Efficient implementation workflow

For UI tasks:

1. Load this skill and `AGENTS.md`.
2. Search for the affected page/component first.
3. Identify existing shared components/styles before editing.
4. Read only affected files, immediate dependencies, and relevant tests.
5. Group related changes by shared component:
   - typography/control fixes together;
   - tooltip/help fixes together;
   - chart fixes together;
   - page-layout fixes together.
6. Implement once at the shared level when practical.
7. Verify desktop and mobile compositions.
8. Run targeted validation once after related changes are complete.

Do not inspect Worker/D1 for a pure styling task unless an existing API contract is necessary to understand missing data.

Do not fix unrelated issues discovered while redesigning.

---

## 22. Definition of done for UI work

A UI task is complete only when:
- the requested desktop design is implemented;
- the `<768px` mobile composition is intentionally designed, not merely compressed;
- 390px mobile is checked;
- no horizontal overflow remains;
- light and dark themes remain usable;
- uk/en visible strings are covered;
- loading/empty states are not visually broken;
- keyboard/touch interactions still work;
- existing business behavior is preserved;
- targeted validation required by `AGENTS.md` passes.
