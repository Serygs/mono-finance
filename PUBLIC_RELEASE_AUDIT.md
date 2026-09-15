# Public Release Security Audit

Audit date: 2026-09-15  
Scope: all 632 files tracked at `8717032`, all 96 commits reachable from the local and fetched remote branches, commit metadata, deleted historical paths, and all 29 unique raster-image blobs reachable in Git history.

## Status: FAIL

**DO NOT MAKE THIS REPOSITORY PUBLIC YET.**

No live Monobank token, Cloudflare API token, setup token, session pepper, GitHub token, session cookie, password, or production password hash was found. Publication is nevertheless blocked by three high-severity findings:

1. a production D1 database UUID remains in reachable Git history;
2. the author's personal Gmail address is present in commit metadata for 86 reachable commits;
3. finance screenshots contain detailed financial-looking information without auditable proof that every visible value and identifier is synthetic.

Git history rewriting is required before publication.

## Audit method

- Exported and scanned the complete tracked HEAD tree with Gitleaks 8.30.1, including nested archives to depth 2.
- Scanned Git history with Gitleaks using `--all --full-history`. Gitleaks scanned all 87 non-merge changesets. The nine merge-commit trees were exported and scanned separately so merge-only conflict resolutions were not omitted.
- Enumerated all paths from every reachable commit and searched for sensitive filenames, deleted configuration, local state, databases, dumps, exports, logs, certificates, keys, and binary assets.
- Performed targeted history searches for Cloudflare/D1 identifiers, secret-binding assignments, credential/header literals, password hashes, emails, URLs, IBANs, phone/PAN-like values, private keys, and GitHub token formats. Candidate values were classified without reproducing complete sensitive values in this report.
- Visually inspected all 29 unique raster-image blobs reachable in history and checked them for EXIF, XMP, IPTC, and GPS metadata.
- Reviewed the single-owner bootstrap flow, D1 schema constraints, route authentication boundary, Wrangler configuration, deployment scripts, package scripts, README, and every GitHub Actions workflow.
- Ran targeted tests for authentication, production configuration generation, and the production health URL: 3 files and 12 tests passed.

### Scope limitations

- This audit covers refs present in the local clone: `main`, `dev`, `origin/main`, `origin/dev`, and `origin/chore/refresh-mono-finance-ui-references`. No tags are present.
- Deleted remote refs, GitHub pull-request refs that were not fetched, forks, releases, Actions artifacts/logs, caches, and GitHub's retained object caches are not available from this clone.
- Repository files cannot prove the current values or protection settings of GitHub Secrets, GitHub Variables, the `production` environment, Cloudflare secrets, or the live D1 database. Those settings require a separate control-plane review before publication.
- The local ignored `.dev.vars` and `.wrangler/` exist but are untracked and were deliberately not read. They are not part of a Git publication.

## Findings by severity

### Critical

None found.

### High

#### H-1 — Production D1 database identifier remains in reachable history

- Location: historical `wrangler.jsonc` in commit `a3265da` (`ci: add binding`).
- Evidence: a UUID-form D1 `database_id` was committed with the production database name and binding. It is absent from HEAD, but commit `a3265da` is reachable from `main`, `dev`, and all fetched remote branches.
- Impact: publishing the repository exposes an original production resource identifier and links the public source history to private Cloudflare infrastructure. A D1 UUID is not, by itself, an authentication credential, but its presence violates the stated isolation requirement.
- Required remediation: rewrite every published ref to remove the UUID from the historical `wrangler.jsonc` blob, force-push the rewritten branches, and follow GitHub's sensitive-data purge process for cached refs/objects. Re-run the full-history scan on a fresh clone afterward.
- Rotation: no Cloudflare credential rotation is required solely because a D1 UUID was exposed. If the UUID itself must no longer identify production infrastructure, provision a replacement D1 database and update the protected GitHub variable through a planned data migration; do not treat history rewriting as changing the live database ID.

#### H-2 — Personal author email is embedded in Git metadata

- Location: author metadata in 86 of 96 reachable commits, from the root commit through current HEAD. The address is intentionally redacted here.
- Evidence: the history contains one personal Gmail identity and one GitHub `users.noreply.github.com` identity. Repository content contains only placeholder email domains.
- Impact: making the repository public exposes a persistent personal identifier and increases spam/phishing and identity-correlation risk.
- Required remediation: if the release requirement is truly “no original-author personal identifiers,” rewrite author/committer identities to the GitHub no-reply address across every published ref, then force-push and verify from a fresh clone. A `.mailmap` only changes display in some tools and does not remove the address from commit objects.
- Rotation: not applicable; an email address is not a credential.

#### H-3 — Financial screenshot provenance is not auditable

- Current files: the ten JPEGs under `.agents/skills/mono-finance-ui/references/desktop/` and `.agents/skills/mono-finance-ui/references/mobile/`, added in commit `b991aaa`.
- Historical files: eight deleted Mono Finance PNG reference boards under the same reference tree, added in `ba24615` and deleted in `b991aaa`.
- Evidence: the images visibly contain balances, income/expense totals, transaction dates and times, merchant descriptions, account labels, masked card endings, and named transfer counterparties. Some old boards use `example.com`, and figures differ between boards, which strongly suggests mock data, but neither the files nor repository documentation establishes provenance for every value. Current images include distinctive strings that could have originated from a real statement.
- Metadata result: none of the 29 historical raster blobs contains EXIF, XMP, IPTC, or GPS metadata.
- Impact: without provenance, this audit cannot prove that publication would not disclose personal financial activity or identifiers.
- Required remediation: obtain documented confirmation that every Mono Finance reference image was created only from synthetic data, or replace/remove the images. If any value came from real financial data, rewrite history to purge every affected image blob. Merely deleting the current files is insufficient.
- Rotation: not applicable.

### Medium

#### M-1 — `.gitignore` does not cover required database/export/backup classes

- Location: `.gitignore`.
- Present protections: `.dev.vars*` with `.dev.vars.example` preserved; `.env*` with `.env.example` preserved; `.wrangler`; `*.log`; `node_modules`; `dist`; `coverage`; `playwright-report`; `test-results`; and `dist-ssr`.
- Missing protections verified with `git check-ignore`: `*.sqlite`, `*.sqlite3`, `*.db`, `*.dump`, SQL backup files, `exports/`, `backups/`, Monobank/transaction exports, and bank-statement CSV files are not ignored.
- Impact: a future local D1/SQLite database or financial export can be staged accidentally.
- Required remediation: add explicit rules for local database files, database dumps/backups, archive backups, export directories, and common private-financial export formats while preserving deliberately safe examples.

#### M-2 — Production credentials are exposed to every step in the deploy job

- Location: `.github/workflows/quality.yml`, job-level `env` at lines 63–67.
- Evidence: the Cloudflare account ID and API token are available to checkout/setup, `npm ci`, build, artifact verification, config preparation, migrations, deployment, and health checking. In addition, `npm run deploy:production` rebuilds and regenerates configuration, so the Cloudflare token is present while repository and dependency build code executes.
- Impact: a compromised dependency lifecycle script or malicious code that reaches trusted `main` receives production Cloudflare credentials even when that step does not need them.
- Recommended remediation before accepting public contributions: scope each variable/secret to only the step that requires it; deploy the already-built artifact rather than invoking the self-contained rebuild script in CI; keep the production API token least-privileged. Consider Cloudflare-supported short-lived/OIDC authentication if it fits the deployment model.

### Low / improvement

#### L-1 — GitHub Actions are pinned to mutable major-version tags

- Location: `.github/workflows/quality.yml` uses `actions/checkout@v4`, `actions/setup-node@v4`, and `actions/upload-artifact@v4`.
- Impact: a major-version tag is movable. GitHub states that a full commit SHA is the only immutable action reference.
- Recommended remediation: pin each action to a reviewed full-length commit SHA and use Dependabot to maintain those pins. See [GitHub's secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use).

## Current-file secret audit

### PASS — no confirmed credential values in tracked HEAD

Gitleaks reported five candidates in the exported HEAD tree. All five are safe documentation examples:

- `README.md`: `your-setup-token`;
- Cloudflare Argo reference documentation: `YOUR_API_TOKEN` in three authorization-header examples;
- Workers configuration guidance: the explicit anti-pattern value `sk-live-abc123...`.

Targeted review found:

- no Monobank Personal API token;
- no Cloudflare API token or GitHub token;
- no Cloudflare account ID;
- no D1 database UUID in current `wrangler.jsonc`;
- no real setup token or session pepper;
- no live cookie/session token or authorization header;
- no private certificate, SSH/private key, or credential-bearing package registry configuration;
- no production password hash or owner row;
- no tracked `.dev.vars`, `.env`, `.wrangler/`, SQLite/D1 database, dump, log, export, or backup file.

`worker/auth/auth-service.ts` contains only an all-`A` dummy PBKDF2 hash used to equalize unknown-user login work. Test and Playwright tokens are explicitly named test/E2E placeholders.

Cloudflare documents that local `.dev.vars`/`.env` files must not be committed and that secrets, rather than Wrangler `vars`, are the correct binding type for credentials. The current configuration follows that model. See [Cloudflare Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

## Full-history secret audit

### FAIL — private production configuration and personal metadata remain reachable

- Reachable commits: 96 total (87 non-merge, 9 merge).
- Gitleaks candidates: five, all classified as the same safe examples listed in the current-file audit.
- Supplemental identifier scan: one historical production D1 UUID in `wrangler.jsonc` at `a3265da`.
- Suspicious historical filenames: no real `.dev.vars`, `.env`, local Wrangler state, SQLite/D1 database, database dump, financial export, log, key, or certificate path was found. Only `.dev.vars.example` and source/migration files matched broad filename filters.
- Historical credential values: no confirmed Monobank token, Cloudflare API token, Cloudflare account ID, setup token, session pepper, password, production password hash, session cookie, authorization token, private health hostname, private key, or GitHub token.
- Commit messages: no email, URL, or secret-token marker found.
- Commit metadata: the personal author email finding described in H-2 remains.

The historical D1 UUID is a real resource-shaped identifier that Gitleaks does not classify as a secret, which is why the supplemental Cloudflare-specific scan was necessary. Cloudflare documents that `wrangler d1 create` returns the D1 UUID used in configuration. See [Cloudflare D1 Wrangler commands](https://developers.cloudflare.com/d1/wrangler-commands/).

## Personal data audit

### FAIL pending screenshot provenance

- Text source, tests, scripts, docs, and migrations contain only placeholder emails (`example.com`/`email.com`) and synthetic IDs/names.
- The checksum-valid IBAN and counterparty tax identifier in `worker/monobank/client.test.ts` and `worker/monobank/mappers.test.ts` are copied from Monobank's public API response example, not from a private export. The same public example is visible in the [official Monobank API documentation](https://api.monobank.ua/docs/index.html).
- No production database dump, account export, transaction export, statement, or log is tracked or present in reachable historical filenames.
- Tests use obvious fixture IDs, placeholder owner emails, test tokens, synthetic money values, and mocked same-origin APIs.
- All 29 unique historical raster assets were visually inspected. No embedded metadata exists. The Mono Finance financial imagery still requires the H-3 provenance decision.

## Auth and self-hosting audit

### PASS

The implementation preserves the intended single-user model:

```text
fresh deployment
  -> create the deployer's D1 database
  -> apply migrations
  -> configure private Worker secrets
  -> POST /api/auth/setup with the deployer's email/password and setup token
  -> exactly one owner exists
```

Evidence:

- `migrations/0001_initial_schema.sql` defines `users.is_application_owner` as `CHECK (is_application_owner = 1) UNIQUE`, preventing a second owner at the database boundary.
- `AuthService.createOwner` refuses setup when any user already exists.
- `D1AuthRepository.createOwner` uses `INSERT ... ON CONFLICT DO NOTHING`, and the service maps a failed insert to `setup_unavailable`, covering concurrent setup attempts.
- `/api/auth/setup` requires `X-Setup-Token` and same-origin validation; it accepts the deployer's email/password rather than a repository-owned identity.
- There is no public registration endpoint and no multi-user conversion.
- Migrations create schema only; they do not seed an owner, password hash, session, account, or transaction.
- Private `/api/*` routes pass through the session middleware. Only health and the authentication lifecycle are allowlisted; session/login/logout still perform their own authentication/security handling.

Targeted auth and deployment tests passed: 12/12.

## Cloudflare isolation audit

### Current configuration: PASS

- Current `wrangler.jsonc` contains reusable Worker, local D1, analytics dataset, and environment names only.
- It contains no `account_id`, production `database_id`, API token, production health URL, route hostname, or zone identifier.
- Required application secret names are declared under `secrets.required`; values are not stored in `vars`.
- The production D1 list is empty in source. `scripts/prepare-production-deployment.mjs` validates `CLOUDFLARE_D1_DATABASE_ID` and injects it only into ignored `dist/mono_finance/wrangler.production.json`.
- `.github/workflows/quality.yml` reads the Cloudflare account/API credentials from GitHub Secrets and the D1 ID/health URL from protected GitHub Variables.
- The package lock resolves only from `registry.npmjs.org`; no private package registry or registry token is configured.

### History: FAIL

The historical D1 identifier in H-1 must be purged. A fork of HEAD is isolated, but publishing the existing repository history is not.

## GitHub Actions workflow audit

### PR isolation: PASS

- The only workflow uses `pull_request` and `push` to `main`; there is no `pull_request_target` trigger.
- PR jobs run validation only and reference no production secrets or production environment.
- The deployment job has an explicit `push`/`refs/heads/main` condition and depends on successful quality/browser jobs.
- A fork PR cannot satisfy the deployment condition, even if it modifies the workflow in the PR branch.
- `GITHUB_TOKEN` permissions are explicitly limited to `contents: read` globally and in the deployment job.
- GitHub-hosted runners are used; no public-PR code is sent to a persistent self-hosted runner.

GitHub also does not pass normal Actions secrets to fork-triggered workflows, but the repository does not rely on that behavior: the PR jobs contain no secret references. See [GitHub's workflow-event documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows).

### Trusted deployment: CONDITIONAL PASS

- Repository code deploys only after a push to `main` and references the `production` environment.
- The README requires main-only environment deployment branches and required reviewers.
- Actual branch protection, required-reviewer rules, environment secret placement, and Cloudflare token scopes are external settings and were not verifiable from Git. Before publication, confirm them in GitHub. GitHub documents that environment rules must pass before a job can access environment secrets. See [managing deployment environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).
- M-2 and L-1 remain workflow-hardening work.

## Files that must change before publication

1. `.gitignore`
   - Add local database, SQLite, dump, backup, archive, and private-financial export patterns.
2. `.github/workflows/quality.yml`
   - Scope production variables/secrets to the minimum steps and deploy the already-built artifact.
   - Pin referenced actions to reviewed full commit SHAs.
3. `.agents/skills/mono-finance-ui/references/desktop/*.jpg` and `.agents/skills/mono-finance-ui/references/mobile/*.jpg`
   - Confirm and document synthetic provenance or replace/remove the images.
4. Git history, not merely HEAD
   - Purge the D1 UUID from historical `wrangler.jsonc`.
   - Rewrite the personal author/committer email if the no-personal-identifiers requirement remains.
   - Purge the Mono Finance screenshot blobs if provenance cannot be established or any image derives from real financial data.

Any index/skill documentation that references removed images must be updated as part of the later cleanup phase. No cleanup was performed in this audit phase.

## Credentials and resources to rotate before publication

### Mandatory from repository evidence

- **None.** No credential value was found in tracked files or reachable history.

### Resource/privacy action

- The historical D1 UUID is not an authentication credential. History rewrite is mandatory. Replacing the D1 database is necessary only if the production resource must no longer be linkable by that identifier.

### External-state checks

- Confirm the production `SETUP_TOKEN` was rotated or removed after owner creation, as already required by the README. This is operational hygiene, not a response to a detected leak.
- Confirm the Cloudflare API token is least-privileged and stored as a protected environment secret.
- If any screenshot is found to contain real data, assess the affected bank/account information separately; credential rotation does not remove disclosed transaction history.

## Is Git history rewriting required?

### YES

At minimum, rewrite all published refs to remove:

1. the production D1 UUID from commit `a3265da` and descendant history;
2. the personal Gmail author/committer identity from the 86 affected commit objects.

Also purge the Mono Finance image blobs if their synthetic provenance cannot be established.

After rewriting:

1. force-push every retained branch and tag;
2. remove obsolete remote branches/refs that retain old objects;
3. request GitHub cache/PR-ref cleanup where applicable;
4. have every collaborator replace old clones instead of merging old history back;
5. perform a fresh clone and rerun both full-history Gitleaks and the Cloudflare/PII-specific scans;
6. verify GitHub branch protection and the `production` environment before changing visibility.

Until these steps and the H-3 provenance decision are complete: **DO NOT MAKE THIS REPOSITORY PUBLIC YET.**

## Post-remediation publication readiness (2026-09-15)

The current working tree now includes an MIT license, public-facing README,
fresh-fork self-hosting instructions, security and contribution policies,
documented secret handling, expanded ignore rules for local databases/exports,
and step-scoped Cloudflare credentials in the deployment workflow. No
repository visibility change, deployment, or credential rotation was performed.

Validation completed successfully: `npm run format:check`, `npm run lint`,
`npm run typecheck`, `npm run test:coverage` (188 tests; coverage above all
configured floors), `npm run build`, `npm run security:client-bundle`, and
`npm run audit:dependencies` (0 vulnerabilities). The repeat current-tree
Gitleaks scan reported only redacted, documented placeholders in Cloudflare
examples and setup instructions. The repeat full-history scan reported the
same safe placeholders described above.

The local all-ref history rewrite is now complete: the production D1 UUID and
personal author identity were replaced, old image paths were purged, backup
refs/stashes were removed, and unreachable objects were pruned. The remote
repository has not been force-pushed by this task. Publication therefore still
requires an owner-approved force-push of every published branch/ref followed
by a fresh-clone verification; until that remote operation is complete, **DO
NOT MAKE THIS REPOSITORY PUBLIC YET.**
