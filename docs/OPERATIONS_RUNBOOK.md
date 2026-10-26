# Operations and release checklist

## Current arrangement

Next.js Node app on Vercel, with a separate optional agent-skill ZIP. The web app needs no user installation. The recorded deployment used CLI publication; automatic GitHub deployment was not connected. Verify the actual account configuration before release. Pushing code does not by itself confirm deployment.

There is no durable queue, database, saved review history or implemented operational dashboard. Owner, on-call rotation and production SLOs have not been supplied.

## Local checks

Use the [README](../README.md) setup. With no conflicting development server:

```sh
npm run typecheck
npm test
npm run evals
npm run build
npm run test:e2e
npm run check:secrets
```

The browser tests are controlled/synthetic where documented. They do not replace a live integration check. This source release includes the UI matrix and web-app/ZIP-download regression tests.

## Authorized release gate

1. Review the exact diff and source SHA; preserve unrelated work.
2. Confirm all changed-path tests and a production build. Review warnings, not only exit codes.
3. Check server-only environment configuration privately; never print or record the key.
4. If publishing downloadable packages, rebuild them and test extraction/installation in a clean approved environment.
5. Confirm runtime limits and provider quotas in the hosting account. The source's maxDuration export is not proof of effective account limits.
6. Deploy only with the owner's authority. Check public routing and a capped, consented real static review; test live AI separately when authorized.
7. Record deployed SHA, deployment identifier, environment and actual outcomes. Retain the previous known-good deployment identifier.
8. Roll back to a verified prior deployment only with owner approval; verify afterward. No specific provider rollback command is assumed here.

## Incident triage

| Symptom | Check first | Safe immediate behavior |
| --- | --- | --- |
| Input rejected | Supported formats, size, required context and consent | Correct input; do not bypass validation |
| GitHub unavailable | Public accessibility, rate limit, provider status | Retry later; do not substitute unrelated source |
| Model error | Server configuration, quota and structured error | Explicit static-only retry without screenshot, or wait |
| Partial dependency coverage | OSV reachability and supported lockfile | Keep unavailable label; do not claim clean security |
| Process slowdown/memory pressure | Input size, concurrent work, stage duration | Reduce approved load; do not increase limits blindly |
| Report lost after refresh | Expected memory-only lifecycle | Re-run or use a previously downloaded report |
| Suspected credential exposure | Exact credential owner/provider | Revoke/rotate through approved process; do not publish the value |

Suggested future telemetry: request identifier, stage timings, coarse payload sizes, provider status codes, repair count and result status. Avoid logging source text, screenshots, prompts or credentials. This telemetry is a proposal, not currently instrumented.

## Before submission

Confirm official challenge requirements, team contributions, share permissions and live demo behavior. Use [DEMO_GUIDE.md](DEMO_GUIDE.md) and [upload checklist](../submission/UPLOAD_CHECKLIST.md). Keep fallback demonstrations explicitly labeled.

[Scalability](SCALABILITY_REPORT.md) · [Security](SECURITY_AND_PRIVACY.md)
