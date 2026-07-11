# Security Policy

## Scope

This repository is a public proof-of-work application. Public review routes and protected shared-data mutations are intentionally separated.

## Supported state

Security fixes are applied only to the current default branch and the currently deployed public release. Historical branches and preview deployments are not supported unless explicitly listed in an open issue.

## Reporting a vulnerability

Do not open a public issue containing credentials, personal data, private URLs, exploit payloads, or reproduction data that could expose users or infrastructure.

Report the minimum necessary details privately to the repository owner through GitHub's private vulnerability reporting feature when available. If private reporting is unavailable, open a public issue containing only a request for a private contact channel and no sensitive technical details.

Include:

- affected route or component;
- observed impact;
- safe reproduction steps with synthetic data;
- affected commit or deployment URL;
- whether any credential or personal data may be involved.

## Credential incident rules

If a real credential is found in Git history, an issue, an artifact, a deployment log, or a screenshot:

1. treat the credential as compromised;
2. revoke or rotate it at the provider;
3. do not paste the value into GitHub;
4. identify affected deployments and logs;
5. document only the credential type, scope, rotation status, and affected commit range;
6. perform history cleanup only through a separately reviewed incident plan.

Deleting the visible line is not remediation. Humans keep rediscovering this with impressive consistency.

## Security boundaries

- real `.env` files and credentials must never be committed;
- public routes must not gain persistent write capability without explicit authorization checks;
- service-role credentials remain server-side only;
- admin and cron tokens must be high-entropy and independently rotatable;
- logs, screenshots, test artifacts, and error responses must redact secrets;
- no production data is permitted in fixtures or public evidence packs;
- dependency, deployment, and route-security changes require review and validation.

## Non-goals

This proof-of-work is not represented as a hardened multi-tenant SaaS. The policy does not turn an MVP into a bank merely because Markdown has been written about it.
