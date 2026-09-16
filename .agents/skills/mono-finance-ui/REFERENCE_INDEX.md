# Mono Finance UI reference index

## Canonical private references

Private or project-provided references may be canonical visual sources even
when they are intentionally absent from the public repository. When one is
available in the task or project context, it overrides legacy UI presentation
and conservative stylistic defaults for its matching page.

Canonical reference names:

- `overview-desktop`
- `overview-mobile`
- `transactions-desktop`
- `transactions-mobile`
- `categories-desktop`
- `categories-mobile`
- `accounts-desktop`
- `accounts-mobile`
- `more-desktop`
- `more-mobile`

Do not restore financial screenshots from Git history or commit private
reference assets unless their provenance is explicitly confirmed safe for
public release.

## Usage

Inspect only the desktop/mobile references that match the page being changed.
Treat an available canonical reference as the visual contract, not loose
inspiration. It may establish page-specific art direction in addition to the
shared design system.

Match as closely as practical:
- composition;
- hierarchy;
- spacing;
- density;
- typography;
- card proportions;
- navigation;
- toolbar/filter composition;
- tables/lists;
- chart/widget proportions;
- color, iconography, tinted surfaces, backgrounds, and visual differentiation;
- borders and shadows;
- mobile interaction patterns.

Preserve real Mono Finance behavior and data. Never fabricate balances,
transactions, labels, or unsupported functionality as product truth.
