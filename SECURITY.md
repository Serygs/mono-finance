# Security Policy

## Supported versions

Only the latest commit on the `main` branch is supported. Older commits,
branches, and forks should be upgraded before reporting a vulnerability.

## Reporting a vulnerability

Please use GitHub Private Vulnerability Reporting for this repository when it
is enabled. If it is not enabled, the private contact channel is **TODO:
repository owner must configure a private security contact before publication**.

Do not open a public issue or pull request for a vulnerability. Never include
Monobank tokens, Cloudflare credentials, passwords, session tokens, database
exports, or unredacted financial data in a report. If a credential may have
been exposed, revoke or rotate it immediately and then report the incident
with redacted details.

## Self-hosting responsibility

Mono Finance is self-hosted and single-user. Each operator is responsible for
their Cloudflare account, Worker and D1 access controls, deployment secrets,
backups, logs, domain, and owner password. Keep production secrets in
Cloudflare/GitHub secret stores, never in this repository.
