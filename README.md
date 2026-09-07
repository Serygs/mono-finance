# Mono Finance

Private personal-finance application built as a React SPA and Cloudflare Worker API. The current phase synchronizes Monobank accounts, cards, and bounded transaction-history windows into D1, then exposes those immutable records through a paginated transaction browser.

## Development

```sh
npm run dev
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run db:migrate:local
```

Copy [`.dev.vars.example`](.dev.vars.example) to `.dev.vars`, add real local secrets, then run `npm run db:migrate:local` before starting the app. The local application is available at `http://localhost:5173`; use the one-time setup endpoint documented in [Phase 4 authentication](docs/phase-4-authentication.md) before signing in. Configure the server-only Monobank token as documented in [Phase 5 Monobank API](docs/phase-5-monobank-api.md), synchronize accounts as described in [Phase 6 account sync](docs/phase-6-account-sync.md), then import statements as described in [Phase 7 transaction sync](docs/phase-7-transaction-sync.md). Browse imported records through the [Phase 8 transactions](docs/phase-8-transactions.md) screen, manage analytics-only changes through [Phase 9 transaction corrections](docs/phase-9-transaction-corrections.md), manage effective categories via [Phase 10 custom categories](docs/phase-10-custom-categories.md), link reimbursements through [Phase 11 compensations](docs/phase-11-compensations.md), consume aggregate reports through [Phase 12 analytics](docs/phase-12-analytics.md), and use the [Phase 13 dashboard](docs/phase-13-dashboard.md) for the financial overview. The public health endpoint is `GET /api/health` and returns `{ "data": { "status": "ok" } }`.

## Architecture

- `src/` contains the React application, organized by feature.
- `worker/` contains the Hono API and server-only integration boundaries.
- `migrations/` contains ordered D1 migrations; see [migrations/README.md](migrations/README.md) for local and remote workflows.
- `AGENTS.md` defines mandatory project-specific transaction integrity, security, and architecture rules.

`wrangler.jsonc` provides a local-only D1 binding for development and declares the Worker-only authentication and Monobank secrets. Production remains deliberately unconfigured until a real D1 ID is provisioned; do not add placeholder database IDs. See [Phase 4 authentication](docs/phase-4-authentication.md) and [Phase 5 Monobank API](docs/phase-5-monobank-api.md) before deploying.

## Codex project skills

Repository-scoped Codex skills live in [`.agents/skills`](.agents/skills). Codex automatically discovers each immediate child directory containing `SKILL.md` while working from this repository. Invoke a skill explicitly as `$<skill-name>` when its workflow should be mandatory; otherwise Codex can select it from its description. Restart Codex if a newly added skill does not appear in the skill picker.

| Skill                                                                                                         | Source                                                                                                                       | Intended use                                          |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `cloudflare`, `workers-best-practices`, `wrangler`                                                            | [cloudflare/skills](https://github.com/cloudflare/skills)                                                                    | Cloudflare Workers, D1, bindings, and Wrangler work.  |
| `spec-driven-development`, `incremental-implementation`, `test-driven-development`, `code-review-and-quality` | [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills)                                                        | Feature specification, delivery, testing, and review. |
| `vercel-react-best-practices` (installed from `react-best-practices`), `web-design-guidelines`                | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)                                                      | React performance and UI/accessibility reviews.       |
| `frontend-design`                                                                                             | [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design)                                   | Production frontend and dashboard UI work.            |
| `data-visualization`                                                                                          | [openai/plugins](https://github.com/openai/plugins/tree/main/plugins/build-web-data-visualization/skills/data-visualization) | Financial analytics and chart design.                 |
| `yafa-ui-dashboard`                                                                                           | [rejourneyco/yafa-ui-dashboard](https://github.com/rejourneyco/yafa-ui-dashboard)                                            | Responsive, accessible analytics dashboard UX.        |
| `mono-finance-dev`                                                                                            | This repository                                                                                                              | Mandatory Mono Finance domain and architecture rules. |

The skills were installed as source snapshots with the Codex skill installer; they are documentation/workflow assets only and add no runtime or build dependencies.

### Mono Finance project skill

Use `$mono-finance-dev` in every future prompt that changes Mono Finance application code, schema, API, analytics, integrations, offline behavior, or customer-facing UI. It is located at [`.agents/skills/mono-finance-dev/SKILL.md`](.agents/skills/mono-finance-dev/SKILL.md), is automatically discoverable from this repository, and routes each task to the relevant domain reference. It adds no runtime dependency and does not authorize work outside the prompt's stated phase.

### Sources not installed

- **OWASP Secure Agent Playbook:** its skills are packaged as a Claude plugin and depend on sibling plugin plays and reference data. The Codex installer only installs self-contained directories with `SKILL.md`, so copying individual OWASP skills would leave their required references unresolved. Use the upstream playbook as a review reference until it provides a self-contained Codex package, or adapt the required plays into a project skill deliberately.
- **`web-pwa-offline-first`:** the supplied skill requires IndexedDB to be the authoritative data store. That conflicts with this project’s stated rule that D1 remains the source of truth and IndexedDB is an encrypted cache, so it was intentionally not installed.
