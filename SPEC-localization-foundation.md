# Spec: Localization Foundation

## Objective

Provide complete English and Ukrainian frontend copy through one `I18nProvider`. The owner can switch language before or after login; the choice persists locally and updates the document language.

## Commands

- Test: `npm test`
- Browser test: `npm run test:e2e`
- Typecheck: `npm run typecheck`
- Build: `npm run build`

## Project Structure

- `src/features/localization/`: provider, dictionaries, hook, switcher, and tests.
- Existing screens consume the provider; no component owns an independent language flag.

## Testing Strategy

Unit-test locale resolution/interpolation and browser-test language switching across login, dashboard, transactions, settings, and transaction details.

## Boundaries

- Always: fall back to English, persist only the locale, use `Intl` for locale-sensitive values.
- Never: translate provider identifiers, currency codes, account IDs, or user-authored/category text.

## Success Criteria

- English and Ukrainian are selectable from one shared control.
- Every current customer-facing screen obtains application copy from the wrapper.
- Refresh preserves the selected language.
- `<html lang>` matches the active locale.
