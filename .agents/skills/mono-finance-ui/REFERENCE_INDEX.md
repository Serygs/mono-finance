# Mono Finance visual reference index

The bundled references are the visual source of truth for redesign work.

Use page-specific desktop + mobile references together. Preserve real Mono Finance data and behavior, but replace legacy presentation when it conflicts with these references.

## Canonical page mapping

### Overview / Огляд
- Desktop: `references/desktop/01-overview.png`
- Mobile: `references/mobile/02-mobile-overview-and-management.png`
- Supplemental mobile behavior: `references/mobile/04-responsive-mobile-reference.png`

### Transactions / Транзакції
- Desktop: `references/desktop/02-transactions.png`
- Mobile: `references/mobile/01-mobile-reference-board.png`
- Supplemental mobile behavior: `references/mobile/03-mobile-light-dark-and-core-pages.png`

### Categories / Категорії
- Desktop: `references/desktop/04-categories-settings-accounts-recurring.png`
- Mobile: `references/mobile/02-mobile-overview-and-management.png`
- Supplemental: `references/mobile/03-mobile-light-dark-and-core-pages.png`

### Accounts / Рахунки
- Desktop: `references/desktop/04-categories-settings-accounts-recurring.png`
- Mobile: `references/mobile/02-mobile-overview-and-management.png`
- Supplemental: `references/mobile/03-mobile-light-dark-and-core-pages.png`

### More / Settings / Ще / Налаштування
- Desktop: `references/desktop/04-categories-settings-accounts-recurring.png`
- Mobile: `references/mobile/03-mobile-light-dark-and-core-pages.png`
- Supplemental: `references/mobile/04-responsive-mobile-reference.png`

### Analytics
- Desktop: `references/desktop/03-analytics.png`
- Use as a supplemental chart-density reference only unless Analytics itself is being redesigned.

## Reference boards

The mobile boards are intentionally not scaled-down desktop layouts. They demonstrate dedicated `<768px` composition, touch controls, iOS/PWA safe areas, card/list transformations, and bottom navigation.

When multiple screens appear in one board, use only the section relevant to the page being changed.

## Fidelity rules

For every redesign:
1. open the matching references before implementation;
2. match hierarchy, spacing, density, typography scale, card proportions, control placement, navigation, and overall balance as closely as practical;
3. preserve real data/business logic but not legacy DOM/layout;
4. do not copy fake values or unsupported actions from generated mockups;
5. compare the result at 1440px desktop and 390px mobile before completion;
6. continue iterating if the result still resembles the legacy UI more than the references.

## Existing bundled assets

Desktop:
- `references/desktop/01-overview.png`
- `references/desktop/02-transactions.png`
- `references/desktop/03-analytics.png`
- `references/desktop/04-categories-settings-accounts-recurring.png`

Mobile:
- `references/mobile/01-mobile-reference-board.png`
- `references/mobile/02-mobile-overview-and-management.png`
- `references/mobile/03-mobile-light-dark-and-core-pages.png`
- `references/mobile/04-responsive-mobile-reference.png`
