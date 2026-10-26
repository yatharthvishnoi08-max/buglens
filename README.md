# BugLens
### From “something is broken” to a source-linked fix plan.

**A repository-first code-review workspace and reusable Gemma 4 agent skill.** Add a public GitHub repository, describe a problem or attach supported evidence, and get a review report, remediation documentation and prompts an authorized coding agent can use to investigate the fix.

[Try the live app](https://buglens-rust.vercel.app/demo) · [90-second demo](docs/DEMO_GUIDE.md) · [Verification report](docs/TEST_REPORT.md) · [Submission PDF](submission/Project_Submission_Report.pdf) · [Documentation](docs/INDEX.md)

## The problem we address

A screenshot shows a symptom, a log shows an error, and a repository contains possible causes. Developers still need to connect them before they can make a safe change. BugLens brings those inputs into one review workflow and produces an evidence-linked handoff—not an unsupported “your code is fixed” claim.

## Three things you can do

1. **Review a repository.** Inspect a commit-pinned public GitHub snapshot with deterministic checks, optional Gemma 4 source review and optional npm dependency advisories.
2. **Investigate a reported problem.** Add text, logs, code attachments or a screenshot with expected/actual behavior. Keep reported symptoms separate from verified source evidence and hypotheses.
3. **Move from findings to action.** Download a full report, remediation documentation and combined or per-finding fix prompts, with explicit verification targets and coverage limits.

## Why this implementation is worth inspecting

| Engineering choice | Why it matters | Inspect the implementation |
| --- | --- | --- |
| **Source references are validated, not merely displayed** | A model finding must cite a supplied file, line and exact quote; invalid references are rejected | [Source-review validator](src/lib/review/model.ts) |
| **Evidence has provenance** | Screenshot observations, reporter statements and suspected causes are kept separate | [Evidence schemas](src/lib/schema/evidence.ts), [report compiler](src/lib/review/report.ts) |
| **Gemma 4 only, with explicit failures** | The adapter rejects other models; a requested AI failure is not hidden behind a different model or synthetic result | [Model adapter](src/model/gemma-client.ts), [adapter tests](tests/gemma-client.test.ts) |
| **A website and a reusable agent skill share one pipeline** | The review workflow is usable from a browser or an authorized agent/CLI environment | [Shared pipeline](src/lib/review/run.ts), [skill](skills/buglens/SKILL.md) |
| **Read-only, bounded repository inspection** | Commit pinning, fixed GitHub hosts and path/size boundaries; imported code is not executed | [GitHub importer](src/lib/review/github.ts), [importer tests](tests/unit/review.test.ts) |
| **The report states what was not checked** | Coverage gaps, incomplete checks and unverified runtime behavior remain visible | [Result schema](src/lib/review/schema.ts), [coverage/report generation](src/lib/review/run.ts) |

These are inspectable design decisions, not claims that no other tool has them.

## Verification at a glance

**94 unit/contract tests passed · 4 synthetic evaluation cases passed · Production build passed · 5 browser tests passed**

Browser tests cover desktop/mobile input-to-artifact journeys; a separate matrix checks 375, 768, 1024 and 1440px layouts and error/partial states. One duplicate matrix invocation is intentionally skipped. Results are local checks of the current UI working tree—not hosted CI badges or a measured model-accuracy score. Repository browser responses are controlled fixtures from the real static pipeline.

**Important gap:** the newer live Gemma source-review path has not yet produced a verified successful live result in the recorded checks. Prior screenshot-only model success does not prove this path. [Full evidence and limitations](docs/TEST_REPORT.md).

![Actual redesigned local BugLens interface; its preview is explicitly synthetic](docs/assets/ui/landing-1440.png)

*Release note: this screenshot shows the local, uncommitted `ui-antigravity` redesign. The live app remains the prior release; publishing this README does not deploy the UI.*

## Feature status

| Feature | Status | Source path | Verification evidence |
| --- | --- | --- | --- |
| Public repository import and bounded source checks | Implemented | [Importer](src/lib/review/github.ts), [checks](src/lib/review/checks.ts) | Unit/contracts; recorded historical live integration |
| Text/file problem input and three artifact downloads | Implemented | [Inputs](src/lib/review/inputs.ts), [compiler](src/lib/review/report.ts) | Desktop/mobile controlled-response browser tests |
| Gemma source and screenshot analysis | Implemented | [Source review](src/lib/review/model.ts), [adapter](src/model/gemma-client.ts) | Reference/adapter tests; fresh source-review live success unverified |
| Dependency security review | Partial | [OSV client](src/lib/review/checks.ts) | Exact npm versions only; contracts and historical integration |
| Exhaustive runtime/security audit | Proposed | [Scope](docs/architecture.md) | Not implemented; imported code is never executed |
| Explicit offline screenshot demo | Mocked | [Fixtures](fixtures), [sample test](tests/e2e/sample-journey.spec.ts) | Synthetic pipeline, not live model evidence |

“Implemented” describes code availability, not successful live verification.

## Workflow
1. Add an HTTPS GitHub repository URL. BugLens resolves the default branch to a fixed commit.
2. Choose **Repository-wide review** or **Investigate a reported problem**.
3. Optionally paste a description, error, stack trace, logs or code. Attach up to three supported UTF-8 text/code files or an optional PNG/JPEG/WebP screenshot with expected/actual behavior.
4. Select Gemma 4 source review and/or npm dependency advisory checks. Read and accept the external processing notice when enabled.
5. Inspect findings and coverage, then copy/download the report, documentation or fix prompt. Each finding also has its own prompt.

A reported problem drives source selection and the combined fix prompt. General repository findings remain separately labeled; they are not automatically presented as causes of that problem.

## What is checked
- Deterministic source patterns for potential injection boundaries, shell execution, disabled TLS checks, broad CORS, embedded credentials, UI clipping/fixed widths, missing image alt text, hidden focus indicators, unstable list keys, swallowed exceptions and skipped tests.
- Optional Gemma review of selected source excerpts for functionality, security, UI, accessibility, testing and maintainability concerns.
- Optional OSV advisory/version matches for up to 200 exact npm dependencies from package-lock.json v2/v3.
- Optional Gemma screenshot observations, kept separate from reporter statements and source hypotheses.
- File/line/exact-quote validation for model-generated source findings.

**This is a bounded static review, not a complete audit.** BugLens does not execute repository code, install its dependencies, run its tests, launch its app, perform penetration testing or measure runtime performance. Every finding needs verification. Zero findings does not mean the repository is correct or secure. The report records checks performed, exclusions, truncation and work not run.

## Inputs and outputs
Public GitHub repositories only; private repositories and branch selection are not implemented. Supported text attachments include TXT, Markdown, logs, JSON, YAML, XML, CSV/TSV and common source-code formats. Each text input is limited to 20,000 characters; up to three files and 60 KB combined. PDFs, Word documents, archives, audio and video are not parsed: provide relevant text/transcripts or screenshots.

Web screenshots are limited to 4 MB on Vercel (8 MB locally unless configured lower). Output is held in the browser's React memory, with no saved history; download before refreshing.

Outputs:
- Findings with source evidence, review priority, uncertainty, suggested investigation and verification targets.
- `buglens-report.md`: scope, supplied problem, findings and limitations.
- `buglens-remediation.md`: source inventory, problem register and acceptance checklist.
- `buglens-fix-prompt.txt`: a coding-agent handoff that requires verification before changes and safe regression testing. This is not a shell command or a guaranteed patch.

## Local setup
Node 20.18+ and npm are required.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://127.0.0.1:3000`. These commands match the manifest. Development start, production build/start and browser tests were run in the existing installed checkout; a fresh `npm ci` was not repeated during this documentation pass.

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Server-only Google credential for live AI |
| `GEMMA_MODEL` | Only accepted model: `gemma-4-26b-a4b-it` |
| `DEMO_MODE` | `fixture` enables the explicit synthetic screenshot sample |
| `MAX_UPLOAD_MB` | Image limit: example 8 locally; capped at 4 on Vercel |

Set `GEMINI_API_KEY` only in the server environment for live AI. The only permitted model is `gemma-4-26b-a4b-it`; there is no Gemini, alternative-model or synthetic fallback after an AI failure. Static repository review works without a model key. The old explicit synthetic screenshot sample is available through **Try the sample bug**, separately from real repository reviews.

## Reusable agent skill
Download/extract the skill ZIP. From that directory:

```sh
npm install --ignore-scripts
node scripts/review-repository.mjs --github https://github.com/owner/repo --artifact report
node scripts/review-repository.mjs --github https://github.com/owner/repo --text "Describe the problem" --artifact prompt
```

For authorized external analysis, add `--ai --dependencies --allow-external`; configure the key in the environment. Optional screenshot flags: `--image /absolute/screenshot.png --context /absolute/reporter.json --allow-external`. Reporter JSON has `expectedBehavior`, `actualBehavior` and optional `environment`. See [SKILL.md](skills/buglens/SKILL.md) for the separate original local screenshot workflow.

In this source checkout use `npm run skill:review -- --github https://github.com/owner/repo`. Rebuild standalone scripts and ZIPs with `npm run skill:package`.

## Architecture and privacy
The Next.js Node API and CLI share `src/lib/review`. GitHub archives are downloaded from fixed GitHub hosts, pinned to a commit, read in memory and never extracted/executed. Unsafe paths, symlinks, build/dependency folders and sensitive-looking files are excluded.

Limits: 20 MB compressed / 64 MB expanded archive, 1,000 supported files, 8 MB source total, 256 KB per source file (2 MB for package-lock.json). Gemma receives at most 16 source excerpts / 45,000 source characters plus supplied problem text. Common credential patterns are redacted, but this is not exhaustive. Never submit secrets.

External transfers:
- GitHub receives the public repository request.
- Google receives selected source excerpts, supplied text attachments/context, and screenshots when those AI options are enabled.
- OSV receives dependency names and versions when advisory checking is enabled.

No database, automatic repository modification, issue creation, push or deployment is performed by the review tool. Reports are not intentionally persisted by BugLens; provider and hosting handling is governed by their services. See [architecture](docs/architecture.md).

## Verification
```sh
npm test
npm run typecheck
npm run evals
npm run build
npm run test:e2e
npm run check:secrets
```

The repository UI test uses a controlled response generated by the real static pipeline; live integration results are recorded separately. See [current results](docs/TEST_REPORT.md), [historical verification](docs/verification.md) and [demo instructions](docs/DEMO_GUIDE.md). Tests and a handful of live demonstrations do not establish general model accuracy or complete security coverage. Stop an existing development server before running production browser tests.

## Deployment
The existing app is deployed to Vercel via CLI. Configure server-only `GEMINI_API_KEY`, `GEMMA_MODEL=gemma-4-26b-a4b-it`, `MAX_UPLOAD_MB=4` and optional `DEMO_MODE=fixture` for the explicit sample page. The repository-review route never uses fixture mode. GitHub-to-Vercel automatic deployment requires repository authorization and is not currently connected.

## Submission readiness and team

Official problem statement and submission requirements were not supplied, so challenge alignment and eligibility cannot yet be assessed. No measured social impact, competitive superiority or guaranteed shortlisting is claimed. The project entry has not been submitted.

Team member names, roles and contributions were not supplied; repository ownership is not evidence of authorship. The submission owner must provide these before submission. See [UI integration handoff](docs/UI_HANDOFF.md).
## License

Apache 2.0. See [LICENSE](LICENSE).
