# Architecture and trust boundaries

## Repository review
The browser sends a public GitHub URL, review options, optional problem text/files and an optional screenshot to the Node-only `/api/review-repository` route. The standalone skill calls the same `runRepositoryReview` pipeline.

1. Validate the URL and input limits. Only fixed HTTPS GitHub API and codeload hosts are requested; redirects are disabled.
2. Resolve the default branch to a commit SHA. Download a bounded archive and parse it in memory. No Git hooks, dependencies, repository code or tests run.
3. Skip unsafe paths, symlinks, sensitive-looking files and dependency/build folders. Apply size/file limits and record coverage.
4. Run deterministic source-pattern checks over included supported files. In parallel, optionally request Gemma code review, OSV npm advisory matches and Gemma screenshot analysis.
5. Require exact supplied path, line and quote for every model source finding. Label all findings as needing verification. Keep screenshots, reporter statements and source hypotheses distinct.
6. Compile report, remediation documentation and coding-agent prompts. Include evidence, coverage and explicit runtime gaps.

The problem investigation mode uses the supplied text and screenshot context to rank source excerpts and focus AI review. Broad static findings stay labeled as general repository findings. The combined prompt prioritizes the supplied problem and related source leads.

## Data boundaries
Google receives selected partially redacted source excerpts and problem inputs when code review is enabled, and screenshot/context when visual analysis is enabled. OSV receives exact package names and versions, not repository source. GitHub requests are anonymous; shared API limits can stop a review.

Archives, source snapshots, prompts and images are processed in memory. React holds the output without local/session storage. Refreshing clears it. No server history is intentionally saved. Provider and hosting data practices remain separate. Credential-pattern redaction is not a guarantee; do not submit secrets.

Source is untrusted data. It is never executed. Reports and prompts are also untrusted review leads, not authorization to execute commands or publish changes. Fix prompts require checking repository instructions, preserving unrelated changes, verifying issues and inspecting scripts before safe testing in an approved isolated environment.

## Limits and failure behavior
Archive limits: 20 MB compressed / 64 MB expanded. Source limits: 1,000 files / 8 MB total / 256 KB each, except 2 MB package-lock.json. AI: up to 16 excerpts / 45,000 source characters. OSV: up to 200 distinct exact npm versions from package-lock v2/v3. Other ecosystems and runtime behavior are not checked.

Requested AI failure returns an explicit error, not static-only or fixture output disguised as AI. OSV failure yields a partial report marked unavailable. Semantic validity is not proven by JSON and reference validation: model conclusions can be wrong and static rules have false positives/negatives.

## Original screenshot workflow
The explicit synthetic sample page and authorized local screenshot CLI retain the original `runBugLens` pipeline: image/context validation, provenance-separated visual analysis, deterministic local repository matching and canonical issue compilation. In this separate legacy mode, source remains local and only the image/context is sent to Google. Sample mode validates the exact fixture input and is visibly labeled.
