# Contributing to Mono Finance

1. Fork the repository and create a focused feature branch.
2. Use synthetic accounts, merchants, balances, and transactions only.
3. Never commit Monobank tokens, Cloudflare credentials, passwords, personal
   identifiers, database exports, or screenshots containing real financial data.
4. Run the relevant checks before opening a pull request:
   `npm run format:check`, `npm run lint`, `npm run typecheck`, and targeted tests
   (the full CI workflow runs coverage, build, security, dependency, and browser
   checks).
5. Keep visible UI copy localized in both `uk` and `en`.

Tests must not use real Monobank tokens or contact production services. Pull
requests are validation-only; production deployment is restricted to the
protected `main` workflow.
