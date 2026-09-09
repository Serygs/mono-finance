---
name: mono-finance-dev
description: Apply Mono Finance's immutable transaction, money, security, Cloudflare, offline, and Apple-inspired UI rules when changing this repository.
---

# Mono Finance development

Use this skill for any Mono Finance application, schema, API, analytics, integration, offline, or product UI task. It records repository-specific decisions; follow the user's current task and do not expand the requested product scope.

## Required reading

- Read [architecture.md](references/architecture.md) and [security.md](references/security.md) for every application change.
- Read [monobank-domain.md](references/monobank-domain.md) before adding or changing provider integration, import, account, or transaction persistence code.
- Read [transaction-rules.md](references/transaction-rules.md) before changing transactions, adjustments, exclusions, categories, or compensation links.
- Read [analytics-rules.md](references/analytics-rules.md) before changing calculations, aggregates, reports, dashboards, or currency conversion.
- Read [ui-guidelines.md](references/ui-guidelines.md) before changing customer-facing React UI.

## Non-negotiable invariants

- Imported Monobank transactions are immutable source records. Model user corrections and relationships separately.
- Store monetary values as integer minor units; retain every original amount and currency.
- D1 is authoritative. Any IndexedDB data is an encrypted local cache and must not become a competing source of truth.
- Keep Monobank credentials and all sensitive operational details in server-only Worker boundaries. Do not expose them in browser code, logs, tests, or error responses.

## Delivery

Keep routes thin, use the shared API error contract, add focused behavior tests, and run the repository's formatting, lint, typecheck, test, and build commands after application changes. After every completed implementation, include exactly one concise, one-sentence commit message in the handoff. Use the installed Cloudflare, React, design, data visualization, and engineering skills when their stated scope applies.
