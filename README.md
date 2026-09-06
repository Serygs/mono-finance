# Mono Finance

Private personal-finance application built as a React SPA and Cloudflare Worker API. The current phase establishes the application skeleton only; it does not yet authenticate users, persist data, or call Monobank.

## Development

```sh
npm run dev
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

The local application is available at `http://localhost:5173`. Its public health endpoint is `GET /api/health` and returns `{ "data": { "status": "ok" } }`.

## Architecture

- `src/` contains the React application, organized by feature.
- `worker/` contains the Hono API and server-only integration boundaries.
- `migrations/` will contain ordered D1 migrations beginning in Phase 3.
- `AGENTS.md` defines mandatory project-specific transaction integrity, security, and architecture rules.

`wrangler.jsonc` separates development and production application modes. A D1 binding is intentionally not configured until a real database is provisioned; do not add a placeholder database ID.

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

The skills were installed as source snapshots with the Codex skill installer; they are documentation/workflow assets only and add no runtime or build dependencies.

### Sources not installed

- **OWASP Secure Agent Playbook:** its skills are packaged as a Claude plugin and depend on sibling plugin plays and reference data. The Codex installer only installs self-contained directories with `SKILL.md`, so copying individual OWASP skills would leave their required references unresolved. Use the upstream playbook as a review reference until it provides a self-contained Codex package, or adapt the required plays into a project skill deliberately.
- **`web-pwa-offline-first`:** the supplied skill requires IndexedDB to be the authoritative data store. That conflicts with this project’s stated rule that D1 remains the source of truth and IndexedDB is an encrypted cache, so it was intentionally not installed.
