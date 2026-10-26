# Gemma 4 on Ollama Cloud

Provider update: 26 October 2026. This note supersedes the earlier Google transport configuration and historical provider-failure evidence. It does not change the product's no-execution or evidence-validation boundaries.

## Configuration and privacy

- Endpoint: `https://ollama.com/api/chat`.
- Only accepted model: `gemma4:31b`; no model or provider fallback.
- Credential: server-only `OLLAMA_API_KEY`, sent as a Bearer header. The old `GEMINI_API_KEY` is not used by the adapter.
- `GEMMA_MODEL`, when set, must equal `gemma4:31b`. No local Ollama install or model download is required.
- Selected source excerpts, supplied problem text and requested screenshots go to **Ollama Cloud**, not Google's API. The website's consent and privacy text reflect this transfer.
- Redirects are refused; requests time out after 45 seconds. Raw upstream errors, keys and thinking output are not returned to the browser.
- Only completed assistant output is accepted. Different returned model IDs, truncation and tool calls are rejected. Missing returned IDs remain unknown, never invented.
- Ollama Cloud does not currently enforce structured output schemas. BugLens requests JSON in prompts, validates the existing strict schemas and exact source references, and permits one output-repair attempt. Validation was not weakened for this migration.

Official references: [cloud API](https://docs.ollama.com/cloud), [authentication](https://docs.ollama.com/api/authentication), [chat](https://docs.ollama.com/api/chat), [structured-output limitation](https://docs.ollama.com/capabilities/structured-outputs).

## Observed live checks before deployment

| Check | Observed result |
| --- | --- |
| Minimal text connectivity | HTTP 200; returned `gemma4:31b`; completed answer |
| Real public repository review | `yatharthvishnoi08-max/yourbuyeragents`, main commit `b6bc2ba6da8e1169a04e93f1cc637f616e9689cb`: 30 scanned source files, 13 AI excerpts, 6 source-validated AI findings, 20 combined review leads |
| Generated artifacts | Nonempty full report, remediation documentation and fix prompt |
| Screenshot analysis | Real Ollama call on the synthetic clipping image; strict validation passed with 4 evidence items; no recorded fixture substituted |
| Automated tests | 101 unit/contract tests passed across 8 files, including 26 model transport tests |
| Build and synthetic evaluation | Next.js production build passed; 4 deterministic fixture cases passed |
| Browser regression | 7 desktop/mobile tests passed in 18.1 seconds; 1 duplicate viewport-matrix invocation intentionally skipped |
| Secrets and packaging | Source and standalone skill ZIPs rebuilt; both configured provider keys absent from distributable files and production client assets |

Findings remain investigation leads, not confirmed defects. One successful repository and image do not establish accuracy, exhaustive coverage, sustained availability or load capacity. The repository archive exceeded a per-file inspection limit; reported coverage remained truncated. No repository code or tests were executed. OSV was not part of this live check.

Earlier PDF reports, rendered architecture images and archived evidence are dated snapshots of the Google-backed release. Use this note, the current source and README for the active provider configuration.
