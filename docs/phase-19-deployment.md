# Phase 19: GitHub CI/CD and Cloudflare deployment

## Delivery model

Mono Finance uses GitHub Actions as the single deployment authority. Pull requests run formatting, lint, TypeScript, unit/coverage, build, browser, client-bundle, and dependency-audit gates. A `main` push must pass those same jobs before the `deploy-production` job can start. That job targets GitHub's `production` environment, so configure required reviewers and restrict deployment branches to `main` in repository settings before the first release.

GitHub Actions is preferred over Cloudflare's direct Git integration here because D1 migrations, artifact checks, deployment, and the health check must share one ordered, reviewable workflow. Cloudflare Git integration is simpler for static sites but would split this release transaction across two systems.

## One-time production setup

1. Create the remote D1 database with `npm run db:create -- mono-finance-production` from an authenticated trusted workstation.
2. In GitHub repository **Settings → Environments → production**, require reviewers and allow only `main`. Create the non-secret environment variables:
   - `CLOUDFLARE_D1_DATABASE_ID`: the UUID returned by D1 creation.
   - `PRODUCTION_HEALTH_URL`: the HTTPS public URL ending in `/api/health`.
3. Create a least-privilege Cloudflare API token scoped to the production account. It needs Worker script edit access and D1 edit access; add route/zone edit access only when a custom route is managed by Wrangler. Store it as the GitHub `production` environment secret `CLOUDFLARE_API_TOKEN`.
4. Store the Cloudflare account ID as the GitHub `production` environment secret `CLOUDFLARE_ACCOUNT_ID`.
5. Configure the three application secrets directly on the `mono-finance-production` Worker, not in GitHub and not in `wrangler.jsonc`: `MONOBANK_TOKEN`, `SESSION_TOKEN_PEPPER`, and `SETUP_TOKEN`. Use the Cloudflare dashboard's **Workers & Pages → Settings → Variables and Secrets**, or interactively run `wrangler secret put <SECRET_NAME>` using the ignored generated config after `npm run build` and `npm run prepare:production`.
6. Protect `main` with required pull-request reviews and the `Quality gates` status checks.

Cloudflare validates the declared required secret names when deploying. Secret values are never passed as workflow arguments, emitted by scripts, or written to generated configuration.

## Release sequence

The production job builds with `CLOUDFLARE_ENV=production`, then writes the ignored `dist/mono_finance/wrangler.production.json` alongside the Vite Worker artifact using `CLOUDFLARE_D1_DATABASE_ID`. It applies only pending numbered migrations to the D1 binding `DB`, deploys the Worker, then requires a JSON `{ "data": { "status": "ok" } }` response from the configured HTTPS health URL within ten seconds.

For a trusted workstation release, set `CLOUDFLARE_D1_DATABASE_ID` only in the current process and run:

```sh
npm run build
npm run prepare:production
npm run db:migrate:production
npm run deploy:production
PRODUCTION_HEALTH_URL=https://your-domain.example/api/health npm run healthcheck:production
```

Use the PowerShell equivalent for the last environment variable on Windows. The normal GitHub workflow is the preferred release path.

## Rollback and migration safety

If post-deployment health fails, stop further releases, inspect the deployment logs without copying secrets, and roll back the Worker version in Cloudflare Workers deployments. A Worker rollback restores code only: it does not reverse D1 migrations, secrets, or external Monobank effects. Therefore every production migration must be additive/backward-compatible with the previous Worker. Correct schema issues with a new forward migration; never alter an applied migration file.

After a rollback, rerun the HTTPS health check and confirm authentication plus a read-only dashboard request manually. Use Cloudflare D1 backups/time travel only through a separately reviewed recovery procedure; it is not an automated rollback mechanism.

## Configuration boundaries

Development continues to use the local D1 binding in `wrangler.jsonc` and ignored `.dev.vars`. Production obtains its D1 UUID from a protected GitHub environment variable, while Cloudflare stores application secrets as encrypted Worker secrets. GitHub's Cloudflare API credentials are deployment credentials only; they are not Monobank or application session secrets.
