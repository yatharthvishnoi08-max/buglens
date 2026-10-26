# Verified implementation evidence

Checks performed on 26 October 2026. Results below refer to the actual local commands, not proposed tests.

| Check | Observed result |
| --- | --- |
| `npm test` | 64 unit and contract tests passed across six files, including local and Vercel upload limits. |
| `npm run typecheck` | Passed. |
| `npm run evals` | All four deterministic synthetic cases passed: clear and ambiguous cases produced valid drafts; unrelated and blurred cases returned insufficient evidence. This is not a live-model benchmark. |
| `npm run build` | Next.js 16.4.3 production build passed. Landing, demo, result, how-it-works and API routes were generated. |
| Production server | Started locally and returned HTTP 200. |
| `npm run test:e2e` | Core sample journey passed in desktop and 360 × 800 mobile projects. Keyboard submission, visible mode badges, heading focus, Markdown download, no horizontal page overflow and memory-only lifecycle were checked. |
| Live multimodal pipeline | One complete synthetic image-to-issue run succeeded. Requested and returned model: `gemma-4-26b-a4b-it`. Eight repository references were verified and final validation passed. See `live-check.json`. |
| Live website flow | A live browser run reached the validated result page with the Live Gemma 4 badge; `screenshots/live-result.png` records that run. An earlier browser attempt timed out; no fixture fallback was used. |
| Skill validator | The standard skill-creator validator reported `Skill is valid!`. |
| Standalone skill fresh install | Extracted the skill ZIP into a separate temporary directory, installed only its runtime dependencies, and ran `node scripts/compile-issue.mjs --sample --markdown` successfully. It did not depend on the Next.js checkout. |
| Source archive fresh setup | Extracted the source ZIP into a separate temporary directory with no environment file. `npm ci --ignore-scripts`, all 60 tests, and the production build passed there. |
| Credential exclusion | Distributable source and production client assets were checked for the configured key. Private environment files were excluded from both archives; Git ignores `.env.local`. |
| Visual evidence | Desktop/mobile screenshots and a three-frame GIF were captured from the working local application. The GIF is explicitly synthetic fixture mode. |

## Early experiment failures and their limits

The initial JSON-schema-heavy prompt produced a malformed response that mixed schema and instance content. A simpler instance-oriented prompt corrected that format problem. The original subtle crop was still classified as insufficient evidence. The synthetic layout was made more visibly clipped while retaining the actual fixture control and CSS; the live extraction then identified the partial button and preserved reporter provenance for viewport dimensions. The pipeline never replaced a failed live request with fixture data.

This is a narrow demonstration of one obvious symptom. It does not establish general visual accuracy, cause detection, better issue quality or user impact. The four deterministic evaluation cases test pipeline behavior, not Gemma performance on a benchmark.

## Deployment status

The Node production build and local server are verified. The project includes a Dockerfile and instructions for Node hosting. Docker execution, public hosting, GitHub publication and hackathon submission have not been performed. Provider and hosting quotas remain platform configuration, not an application feature.

Node 20 emitted a non-fatal experimental JSON-module warning from dependencies during some runs. The commands still exited successfully.
