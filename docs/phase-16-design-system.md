# Phase 16 design system

Mono Finance uses an original Apple-inspired interface focused on financial legibility: calm neutral surfaces, large page typography, restrained translucency in shell chrome only, semantic money colors, and compact analytical accents. It does not copy Apple assets or screens.

## Source and component ownership

- Global role tokens live in `src/styles/index.css`, reusable primitive styles in `src/styles/design-system.css`, and feature composition in `src/styles/screen-layouts.css`.
- Domain-neutral components live in `src/components/ui/` and are imported directly from their files.
- Feature-specific composition remains in `src/features/`.
- Components use native HTML controls and dialogs so keyboard and assistive-technology behavior does not depend on a UI framework.

Available primitives:

- `PageSurface` and `PageHeader` for route hierarchy;
- `Card`, `KpiCard`, and `ChartContainer` for analytical surfaces;
- `Button`, `IconButton`, and `SegmentedControl` for actions and compact choices;
- `BottomSheet` and `Dialog` for focused overlays;
- `FormField` and `Select` for labelled inputs;
- `AccountChip` and `CategoryChip` for compact domain selections;
- `Alert`, `EmptyState`, and `Skeleton` for async and recovery states.

## Tokens and visual rules

Use role tokens such as `--color-canvas`, `--color-surface`, `--color-text`, `--color-action`, `--color-income`, `--color-expense`, `--radius-card`, and `--shadow-card`. Do not introduce feature-local hex colors when a role token exists.

Pills are reserved for chips and true segmented selections. Actions remain rounded rectangles. Broad content surfaces stay opaque; blur is limited to sticky shell chrome and modal backdrops. Financial values use tabular numerals, and original values remain visually secondary to effective values.

## Responsive and accessible behavior

- The page canvas is capped at `90rem` on desktop and uses asymmetric chart layouts where the content remains readable.
- Below `48rem`, navigation moves to a safe-area-aware bottom bar, transaction details become a bottom sheet, transaction rows use a bounded two-column grid, and account filters use touch-friendly chips instead of a native multi-select.
- The mobile shell is verified at `430px` for iPhone Pro Max and at `390px` and `320px` fallback widths without page-level horizontal overflow.
- Controls retain at least a `44px` target, visible `:focus-visible` treatment, and semantic labels.
- Dialogs use native modal behavior, Escape dismissal, backdrop dismissal, focus containment, scroll locking, and overscroll containment.
- Motion is limited to overlay entry and skeleton opacity; `prefers-reduced-motion` disables both.
- Light and dark palettes are role-based, and form controls set explicit foreground/background colors.

When adding UI, compose these primitives first and add feature CSS only for layout or domain-specific visualization geometry.
