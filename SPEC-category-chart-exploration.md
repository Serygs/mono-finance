# Spec: Category Chart Exploration

## Objective

Make category spending the dashboard's primary composition view: show all returned categories, allow explicit visibility filtering, and coordinate donut segments with their legend.

## Technical Design

- Renderer: the existing single inline SVG donut; no chart dependency.
- Encoding: arc length is expense share, stable category color identifies the series.
- Interaction: hover/focus enlarges the corresponding arc, dims peers, highlights the legend row, and exposes category plus formatted value in visible text.
- State: selected visible categories are encoded in the dashboard URL as repeated `category` parameters; an empty selection means all.
- Mobile: category controls wrap with 44px touch targets; focus/tap offers the same category identification as hover.
- Fallback: the ordered legend and accessible value table remain readable without SVG interaction.

## Success Criteria

- No hard five-category/“Other” collapse hides source categories.
- The same stable color is used in bars, donut, and legend.
- Category visibility is keyboard/touch accessible and survives navigation history.
- Chart totals are calculated from the same filtered aggregate values shown in the legend.
