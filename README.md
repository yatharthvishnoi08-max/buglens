# BugLens
Review your code. Understand the evidence. Plan the fix.

[Live app](https://buglens-rust.vercel.app/demo) · [Public repository](https://github.com/yatharthvishnoi08-max/buglens) · [Download agent skill](https://buglens-rust.vercel.app/buglens-skill.zip)

BugLens is a repository-first code review workspace and reusable agent skill. Add a public GitHub repository, choose a broad static review or investigate a specific problem, and receive source-linked findings, a full report, remediation documentation, and exact prompts to paste into a coding agent.

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

The repository UI test uses a controlled response generated by the real static pipeline; live integration results are recorded separately. See [verification](docs/verification.md) and [demo instructions](docs/submission.md). Tests and a handful of live demonstrations do not establish general model accuracy or complete security coverage.

## Deployment
The existing app is deployed to Vercel via CLI. Configure server-only `GEMINI_API_KEY`, `GEMMA_MODEL=gemma-4-26b-a4b-it`, `MAX_UPLOAD_MB=4` and optional `DEMO_MODE=fixture` for the explicit sample page. The repository-review route never uses fixture mode. GitHub-to-Vercel automatic deployment requires repository authorization and is not currently connected.

## License
Apache 2.0. See [LICENSE](LICENSE).
