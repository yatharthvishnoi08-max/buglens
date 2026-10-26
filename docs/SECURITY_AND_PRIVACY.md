# Security and privacy assessment

**Scope:** source-level controls and known gaps, reviewed 26 October 2026. This is not a penetration-test report, compliance certification or guarantee. Separate product findings from the security of BugLens itself.

## Trust boundaries

| Boundary | Data crossing | Implemented control | Residual risk |
| --- | --- | --- | --- |
| User to API | URL, problem text, attachments, screenshot | Type/size/form checks and external-processing consent | Consent is not identity or authorization; no account-level rate limit |
| API to GitHub | Public repo/commit lookup | Fixed GitHub hosts, HTTPS, redirects rejected, commit pinning | Public access limits/outages; public source is still untrusted |
| Archive to review runtime | Compressed source | Size caps, path/type filtering, no filesystem extraction or execution | In-memory/CPU pressure; parsing libraries still require maintenance |
| API to Google | Selected source and context, or normalized screenshot/context | Server-only credential; model and endpoint allowlist; limited excerpts | Redaction is incomplete; provider handling is outside this code |
| API to OSV | Package names and exact versions | Bounded batch and response; no source submission | Package metadata still leaves the application |
| Findings to user/agent | Source quotes, explanations and fix prompts | Exact source-reference validation; uncertainty/provenance; verification-first prompt | Prompt injection, false positives and unsafe downstream execution remain possible |

## Implemented safeguards

- Input archives are never installed, executed or extracted to the server filesystem.
- Sensitive-looking paths and common credential patterns are excluded/redacted, but not exhaustively.
- Images are decoded with pixel/size checks and re-encoded without retaining metadata.
- Source findings must point to supplied lines and quotes; schema validity does not prove semantic correctness.
- Server credentials are not exposed as public environment variables.
- Output is held in React memory without report history or intentional server persistence.
- Static-only is an explicit user choice; AI failure is not disguised as successful static or synthetic output.

Sources: [importer](../src/lib/review/github.ts), [checks/redaction](../src/lib/review/checks.ts), [image validation](../src/lib/image.ts), [model adapter](../src/model/gemma-client.ts), [API](../src/app/api/review-repository/route.ts), [session](../src/components/ReportSession.tsx).

## Known gaps and recommended owner actions

1. Add authenticated admission, provider-spend limits and bounded concurrency before broader exposure.
2. Propagate cancellation to provider calls and stop sibling work after terminal failure.
3. Define and publish retention, logging, provider-processing and incident policies before collecting sensitive information. Hosting logs/telemetry and provider retention were not audited here.
4. Do not submit private personal information, tokens, credentials or proprietary material without appropriate authorization.
5. Treat prompts and repository contents as untrusted; an agent must inspect its environment and commands before executing fixes.
6. Review the previously recorded development dependency advisories and rerun a dependency audit before a production release.
7. Any credential pasted into chat or exposed elsewhere should be replaced through its provider's approved process. This documentation does not revoke credentials or reproduce their values.
8. If adding persistent jobs/caching later, require tenant isolation, authorization, encryption, expiry and deletion tests before launch.

## Verification versus missing evidence

Importer, consent, redaction, model restriction and contract tests are in the recorded suite. No adversarial red-team exercise, exhaustive secret scan, external penetration test, provider-retention audit or comprehensive abuse/load test is claimed. A configured-key scan only checks that particular key and private env files; it does not prove absence of all secrets.

[Observed tests](TEST_REPORT.md) · [Capacity risks](SCALABILITY_REPORT.md) · [Operations](OPERATIONS_RUNBOOK.md)
