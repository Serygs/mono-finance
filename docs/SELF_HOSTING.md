# Self-hosting Mono Finance

Mono Finance is a self-hosted, single-user Worker + D1 application. A fresh
fork starts with no owner account and no access to the original author's
Monobank, Cloudflare, or database resources.

## 1. Fork and install

Fork this repository, clone your fork, and install Node.js 24 (including npm).
From the repository root run:

```powershell
npm ci
```

## 2. Authenticate Wrangler

Create your own Cloudflare account and authenticate the local CLI:

```powershell
npx wrangler login
```

Use an API token with only the Worker and D1 permissions required by your
workflow. Never put that token in tracked files.

## 3. Create and migrate D1

Create separate databases for local development and production. The commands
print IDs belonging to your account; do not copy those IDs into the repository.

```powershell
npm run db:create -- mono-finance-development
npm run db:create -- mono-finance-production
npm run db:migrate:local
```

Local Wrangler uses the `mono-finance-local` binding in `wrangler.jsonc`. For a
remote database, set `CLOUDFLARE_D1_DATABASE_ID` in your process or GitHub
environment and let `npm run prepare:production` generate the ignored
production Wrangler config before running `npm run db:migrate:production`.

## 4. Configure secrets

For local development, copy the safe example and edit only the ignored file:

```powershell
Copy-Item .dev.vars.example .dev.vars
```

Set these server-only secrets with values belonging to your deployment:

- `MONOBANK_TOKEN` — your personal Monobank Personal API token.
- `SESSION_TOKEN_PEPPER` — an independently generated, high-entropy secret
  used to protect session tokens.
- `SETUP_TOKEN` — a separate temporary bootstrap secret for the first owner
  setup request.

Generate two different secrets (run the command twice) with Node.js:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

For production, configure the three values as encrypted Worker secrets:

```powershell
npx wrangler secret put MONOBANK_TOKEN --env production
npx wrangler secret put SESSION_TOKEN_PEPPER --env production
npx wrangler secret put SETUP_TOKEN --env production
```

## 5. Configure deployment settings

If using the included GitHub Actions workflow, create a protected `production`
environment in your fork. Restrict it to `main` and require review. Add these
environment secrets and variables in that fork only:

Secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Variables:

- `CLOUDFLARE_D1_DATABASE_ID`
- `PRODUCTION_HEALTH_URL` (for example,
  `https://your-worker.example.workers.dev/api/health`)

The Worker secrets above remain configured in Cloudflare; they are not GitHub
variables. Pull-request jobs do not receive any production secrets and cannot
deploy.

## 6. Deploy

After the production environment is configured, push to your protected `main`
branch to run validation and the approved deployment workflow. A trusted local
release can use the same fork-owned values in the current process and run:

```powershell
npm run release:production
```

This builds the client and Worker, binds your D1 ID in an ignored generated
config, applies migrations, deploys to your Cloudflare account, and checks your
health URL. It never uses the original author's infrastructure unless you
deliberately configure it to do so.

## 7. Create the one owner

Once the Worker is deployed, call setup exactly once with your own email and a
long, unique password. Use HTTPS and keep the setup token private:

```powershell
curl.exe --request POST `
  "https://your-worker.example.workers.dev/api/auth/setup" `
  --header "X-Setup-Token: your-temporary-setup-token" `
  --header "Content-Type: application/json" `
  --data '{"email":"you@example.com","password":"use-a-long-unique-password"}'
```

There is no public registration and only one owner row can exist. A successful
setup makes subsequent setup attempts fail.

Rotate `SETUP_TOKEN` immediately after setup by replacing it with a new random
value in the Worker secret store. The current deployment declares this binding
required, so deleting it outright requires first changing that configuration
and redeploying; rotation is the safe default.

## 8. First sync

Log in to your new instance, verify the owner session, and start the first
account and transaction sync. Use only your own Monobank account. Sync is
server-side; the browser never receives your Monobank token.

## Privacy and operations

Back up D1 only to encrypted, access-controlled storage. Do not commit dumps,
exports, logs, screenshots, `.dev.vars`, `.env`, or Wrangler state. Review
Cloudflare access, Worker logs, custom domains, and GitHub environment
protection before sharing the instance URL.
