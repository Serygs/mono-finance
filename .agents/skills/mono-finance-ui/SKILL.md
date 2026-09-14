---
name: mono-finance-ui
description: Canonical UI/UX contract for Mono Finance. Use for every frontend redesign, responsive/mobile task, dashboard/chart change, visual polish, or new product screen.
---

# Mono Finance UI

`AGENTS.md` defines project engineering constraints. This skill defines the visual contract.

## 1. References are the visual source of truth

Before changing a page, open `REFERENCE_INDEX.md` and inspect only the matching references.

The bundled images are not loose inspiration. They are the primary visual target for composition, hierarchy, density, typography scale, card proportions, navigation, filters, list/table density, chart/widget proportions, icons, borders/shadows, and desktop/mobile interaction patterns.

Preserve real Mono Finance data, business rules, APIs, routing, and i18n, but do not preserve legacy presentation merely because it already works. If the existing UI conflicts with a canonical reference, replace the presentation. Page markup, page-level CSS, containers, cards, toolbars, tables, navigation composition, and responsive structure may be rewritten.

Do not stop at an "Apple-like" approximation. Side-by-side, the resulting page should be recognizably the same design system and composition as the matching reference.

Generated reference text, fake values, and unsupported actions are illustrative only. Never fabricate product data or functionality.

## 2. Reference priority

For a page redesign, use references in this order:
1. page-specific canonical desktop/mobile reference when available;
2. canonical reference boards;
3. older supplemental references;
4. this written design contract.

Never mix unrelated page references to invent a hybrid screen.

## 3. Desktop and mobile are separate compositions

Desktop and mobile are two intentional compositions of the same product, not the same layout at different widths.

Breakpoints:
- `>=1200px`: full desktop;
- `768–1199px`: compact desktop/tablet;
- `<768px`: dedicated mobile composition.

Verify redesigned screens at 1440px, 1200px, 768px, 430px, 390px, 375px, and 320px. Never consider a redesign complete after checking desktop only.

Mobile defaults:
- 16px horizontal padding;
- touch-first controls;
- dedicated card/list layouts instead of squeezed desktop tables;
- no horizontal overflow;
- no desktop drag/resize affordances when inappropriate;
- respect iOS PWA safe areas;
- bottom navigation must not cover content.

## 4. Main mobile navigation

Canonical mobile navigation contains:
- Огляд / Overview;
- Транзакції / Transactions;
- Категорії / Categories;
- Рахунки / Accounts;
- Ще / More.

Use the bundled mobile page references for the visual direction.

## 5. Visual language

Mono Finance is a premium personal-finance product, not a generic admin dashboard.

Target:
- Apple-inspired, not a pixel copy of Apple;
- calm, minimal, polished;
- compact and information-dense;
- soft surfaces;
- restrained borders and shadows;
- clear financial hierarchy;
- coherent light/dark themes.

Avoid generic admin-panel aesthetics, oversized cards with little content, heavy shadows, excessive gradients/glassmorphism, raw browser-looking controls, and duplicated page-specific styling for shared controls.

## 6. Typography

Use the system stack:

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

Do not bundle proprietary Apple fonts.

Targets:
- page title: 32–36px desktop, 26–30px mobile, weight 700;
- section title: 18–22px, weight 650–700;
- widget/card title: 14–16px, weight 600;
- body: 14–15px;
- secondary text: 12–13px;
- labels: 12–13px, weight 500–600;
- buttons: 13–14px, weight 550–600;
- important financial values: 18–24px, tabular numbers when supported.

Inputs, selects, textareas, and buttons inherit application typography. Fix typography at shared-control level, not per page.

## 7. Spacing and surfaces

Use the spacing rhythm `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48`.

Typical:
- desktop page padding: 24–32px;
- mobile page padding: 16px;
- card padding: 16–24px;
- compact row vertical padding: 12–16px.

Main cards: roughly 16–20px radius. Nested controls: roughly 10–12px radius. Use subtle 1px borders and soft or no shadow. Prefer spacing/background/border before shadow to create hierarchy.

## 8. Shared primitives

Search for existing shared primitives before creating page-specific ones. Prefer shared implementations for PageHeader, Surface/SectionCard, Button, Input, Select/Dropdown/MultiSelect, Popover/Dialog/Tooltip, InfoTooltip, StatusBadge, SegmentedControl, CompactTable, SearchField, EmptyState, Skeleton, and OverflowMenu.

If a visual fix affects two or more pages, implement it in the shared layer.

## 9. Controls

Desktop target height: 36–44px depending on control type. Mobile touch controls: 44–48px.

Every interactive control needs default, hover when applicable, `:focus-visible`, active, and disabled states.

Do not expose raw `<select multiple>` for product-facing Accounts/Categories selectors when existing popover/dropdown primitives can provide a proper checkbox multiselect.

## 10. Horizontal overflow and PWA

Horizontal overflow is a bug unless explicitly required. Fix its source; do not use `overflow-x: hidden` as the primary solution.

Check fixed/min widths, `100vw`, negative margins, transforms, absolute positioning, grid children, native controls, and chart minimum widths.

Mono Finance is used as an iOS PWA. Respect `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.

Skip-to-content remains keyboard accessible but hidden until intentional focus; prefer `:focus-visible`.

## 11. Overview

Default priority:
1. KPI summary;
2. Recent Transactions;
3. Income vs Expenses;
4. Spending by Category;
5. Spending by Weekday;
6. Spending Trend;
7. longer-term analytics.

Primary KPIs: Total spent, Total income, Net cash flow, Average spend/day. Recent Transactions appears before charts.

Reuse the existing widget/grid system. Desktop widgets may resize/reorder/hide/auto-pack; moving or resizing must not refetch financial data. Mobile uses intentional single-column flow and may disable drag/resize.

### Income vs Expenses
- vertical grouped bars;
- medium/roughly half-width by default;
- at most ~7 chronological buckets;
- visible localized legend;
- tooltip includes period, income, expenses, net cash flow;
- avoid thin bars and large unused width.

### Spending by Weekday
- Monday → Sunday;
- handle negative stored expenses correctly;
- render positive visual magnitude;
- tooltip includes weekday, amount, transaction count;
- if real expense data exists but chart is flat, fix aggregation/filtering instead of hiding it.

### Spending by Category
Prefer horizontal ranking bars. Donut/pie is optional when it duplicates the same information.

Every chart title, legend, axis label, tooltip, and empty state is localized. Never render a blank coordinate system when no useful data exists.

## 12. Contextual help

Use one shared InfoTooltip/Popover for financial explanations. Desktop: hover + keyboard focus. Mobile: tap. At minimum cover KPIs and major Overview widgets. All help copy goes through i18n.

## 13. Categories

Use compact rows/list/table, not giant per-category cards. Desktop actions are horizontal: `[Edit] [Merge] [Delete/⋯]`. Mobile may wrap once if needed. Large MCC lists are paginated; search/filter applies to the full logical dataset.

## 14. Accounts

Use compact account cards/rows and only real available fields: account name, masked number if available, currency, balance, type, sync status/time, and supported actions. Do not invent balance-history graphs or unsupported actions.

## 15. Settings / More

Use compact native-like settings sections. Base currency, language, theme, and sync status should not occupy oversized standalone cards. Do not invent preferences from reference images.

## 16. Recurring payments

Prefer compact list/table rows with supported fields: name, amount, frequency, next payment, status, actions. Do not invent automatic payment execution or misleading monthly normalization.

## 17. Motion

Keep motion subtle and native-like: hover 120–160ms, tooltip 120–180ms, popover/dialog 160–220ms, surface transition 180–250ms. Prefer opacity, small translate, subtle scale. Respect `prefers-reduced-motion`.

## 18. Loading, empty, accessibility

Prefer skeleton rows/cards or inline loading over full-page spinners. Prevent major layout shifts. Empty states are compact, localized, and only offer actions that really exist.

Maintain semantic headings, labels, keyboard navigation, real buttons, accessible dialogs, icon labels, contrast, and visible focus states.

## 19. Localization

`AGENTS.md` strict `uk`/`en` parity applies to every visible string, including chart copy, tooltip/help text, empty/loading states, dialogs, statuses, and controls.

## 20. Visual implementation workflow

For each redesign:
1. open `REFERENCE_INDEX.md`;
2. inspect the exact desktop/mobile references for that page;
3. inspect only the current page, immediate dependencies, and shared primitives;
4. separate business/data behavior from legacy presentation;
5. rebuild presentation as needed rather than minimizing the diff;
6. verify desktop and mobile separately;
7. compare screenshots side-by-side with the references;
8. iterate until major composition/proportion differences are resolved;
9. run targeted validation once.

The current UI is a source of behavior and data bindings, not a visual source of truth.

## 21. Definition of done

A redesign is complete only when:
- the before/after difference is immediately obvious;
- the page resembles the canonical reference at first glance;
- desktop and `<768px` mobile are intentional compositions;
- 1440px and 390px have been visually checked;
- no horizontal overflow remains;
- light/dark themes remain usable;
- uk/en copy is complete;
- loading/empty states are coherent;
- keyboard/touch interactions work;
- real business behavior is preserved.

If the result still resembles the legacy screen more than the canonical reference, continue redesigning.
