# Verification report

## Latest provider update — Ollama Cloud

The 26 October Ollama migration passed 101 unit/contract tests plus real Gemma 4 repository and screenshot calls. See the [migration evidence](OLLAMA_MIGRATION.md) for exact inputs, returned model and limitations. This supersedes the source-AI evidence gap in the historical UI-release table below; old checks are retained without relabeling them as new runs.

Date: 26 October 2026 (Asia/Kolkata, UTC+05:30). Environment: local macOS, Node 20.18.0, Next.js 16.4.3, Chromium via Playwright. Release checks cover the `ui-antigravity` redesign, refreshed logo and clarified web-app/optional-download flow, integrated with documentation base `c92e12d`. These are observed local checks, not hosted CI results or an accuracy benchmark.

## Current verification

| ID / scenario | Expected | Observed / status | Command or steps | Evidence |
| --- | --- | --- | --- | --- |
| T01 Type safety | No TypeScript errors | **Pass** | `npm run typecheck` | Local command exit 0 |
| T02 Unit/contracts | Import, inputs, model restrictions, references, reports, API failures remain valid | **Pass: 94 tests, 8 files** | `npm test` | [Unit tests](../tests/unit), [contracts](../tests/contract), [adapter tests](../tests/gemma-client.test.ts) |
| T03 Synthetic evaluation | Four deterministic fixture cases match expectations | **Pass: 4 cases** | `npm run evals` | [Evaluation runner](../evals/run-evals.ts); not live model accuracy |
| T04 Production build | Compile, type-check and generate routes | **Pass** | `npm run build` | Local build exit 0; Node experimental JSON-module warnings did not fail build |
| T05 Repository journey | Submit text/file input, see source leads, download all three artifacts, clear on reload | **Pass: desktop and mobile** | `npm run test:e2e` | [Repository journey](../tests/e2e/repository-journey.spec.ts), [desktop result](screenshots/desktop-repository-result.png) |
| T06 Synthetic screenshot journey | Keyboard entry, validated draft, focused visible heading, Markdown download | **Pass: desktop and mobile** | Same browser command | [Sample journey](../tests/e2e/sample-journey.spec.ts), [mobile result viewport](screenshots/mobile-result-viewport.png) |
| T07 Routes / responsive | No page overflow at 375, 768, 1024, 1440px for landing, workspace, guide, empty result and 404 | **Pass** | Local UI-state matrix in `tests/e2e/ui-states.spec.ts` | [Screenshots](assets/ui) |
| T08 Empty / loading / error | Required URL validation; disabled pending inputs; recoverable error retains text | **Pass** | Controlled NDJSON response, then retry | [Error state](assets/ui/error-375.png), [loading](assets/ui/loading-375.png) |
| T09 Partial / long / empty result | Partial warning, wrapping long paths, working prompt tab, empty filter state | **Pass** | Controlled partial snapshot and unavailable dependency response | [Partial result](assets/ui/partial-result-375.png), [prompt](assets/ui/prompt-1440.png), [empty findings](assets/ui/empty-findings-1440.png) |
| T10 Selected contrast | Readable primary text / button / feedback pairs | **Pass for measured pairs** | sRGB luminance calculation from CSS hex colors | Ratios below; not a full accessibility audit |
| T11 Public availability | Published workspace responds | **Pass: HTTP 200** | `curl --silent --show-error --location --max-time 20 --output /dev/null --write-out 'HTTP %{http_code}' https://buglens-rust.vercel.app/demo` | Observed 26 October; prior release, no hosted analysis submitted |
| T12 Fresh live source AI | New Gemma source-review result | **Not Run in this pass** | Would require external source transfer and provider quota | Historical attempts failed; see below |
| T13 Runtime audit of submitted repositories | Run arbitrary app/tests/browser/security scans | **Not Run / not implemented** | Not supported by product | Reports explicitly retain `runtimeVerified:false` |
| T14 Secret check | No configured key or private env file in distributable files/client output | **Pass** | `npm run check:secrets` | Release pass checked 248 distributable files and 25 production client assets |
| T15 Web app / optional downloads | Main action opens browser workspace; optional skill downloads a ZIP; developer setup stays collapsed; logo and favicon load | **Pass: desktop and mobile** | `npm run test:e2e` | [Web-app entry regression](../tests/e2e/web-app-entry.spec.ts) |

Release browser run: **7 passed, 1 intentionally skipped, 16.8 seconds**. The skipped duplicate is the mobile project invocation of the viewport matrix; that matrix runs once and explicitly tests all four requested widths. The ordinary mobile journeys run separately at 360x800. The earlier logo-only pass additionally checked the header at 320px.

Browser journeys reported no uncaught page JavaScript errors. This is narrower than asserting there are no console/network warnings. The repository journey intercepts the HTTP response with data produced by the real static pipeline on a controlled snapshot. It does **not** prove a live GitHub, OSV or Gemma request succeeded. The sample uses explicit pre-authored synthetic model output.

Gemma 4 wording follow-up on 26 October: production build and all seven browser tests passed again (17.2 seconds; one duplicate matrix invocation skipped). The entry test now asserts that Gemma 4 source review starts checked and that the guide identifies it as enabled by default, without the former qualifier. Review controls, consent requirements and runtime behavior are unchanged. Diagrams and the four-page PDF were re-rendered and visually checked.

## Defects encountered and retested

- The first UI pass exposed a mobile sample result heading scrolled outside the viewport. The UI focus/scroll timing was adjusted after route transition; the unchanged heading-visibility assertion subsequently passed.
- The new error-state test initially matched both application feedback and Next.js's route announcer. Its locator was narrowed to the actual error banner; application behavior was not weakened.
- A sandbox prevented binding the production server. The test was rerun with local-server permission and completed successfully. The failed start was not counted as an application defect.
- Restricted-network DNS initially blocked the HTTP probe. The authorized network probe then returned 200.

## Visual and accessibility scope

Actual screenshots were inspected for desktop landing, workspace, tablet guide, mobile workspace/error/partial result and the mobile sample result viewport. The matrix captures additional route/viewport combinations. Main journeys test keyboard skip navigation, result focus, a 44px minimum submit target, downloads, no horizontal page overflow and memory-only reset.

Selected contrast ratios from source tokens: body/paper **13.36:1**, secondary text/white **5.49:1**, white/green button **7.11:1**, error **6.44:1**, warning **6.38:1**, focus/paper **5.27:1**. This does not cover every state or certify WCAG compliance. Reduced-motion CSS was inspected; no formal screen-reader, cross-browser, 200% zoom or complete automated accessibility audit was run.

The route error boundary and route-loading fallback were not separately fault-injected. Request error and request loading were exercised.

## Historical evidence, not current proof

[Earlier verification](verification.md) records successful real GitHub/OSV static review and an older live screenshot-only Gemma run. The newer source-AI path returned malformed JSON, then provider HTTP 500 and 429 on subsequent attempts. Parser/repair logic has tests, but a successful live source-review response remains unverified.

The prior audit recorded zero known production dependency vulnerabilities and three development-tool advisories in the Vitest/Tinypool/mocker chain. No fresh dependency audit or toolchain upgrade is claimed here.

No arbitrary target repository was executed. No precision/recall, model accuracy, security certification, time-saved measurement or competitive ranking was established.

## Scalability and resilience checks

No load/soak, peak-memory, p95/p99 latency, concurrency-capacity or cost-per-review experiment has been performed. They are **Not Run**, not failures or implied passes. The [scalability report](SCALABILITY_REPORT.md) inventories source limits and proposes a measurement protocol; its future architecture is not deployed.

The original documentation-only expansion did not rerun application suites. The subsequent UI release reran 94 unit/contract tests, all four synthetic evaluations, the production build and seven browser tests. Diagram rendering, Markdown links and archive integrity remain separate documentation checks and do not establish application correctness or capacity.

Documentation checks on 26 October 2026: all four Mermaid diagrams parsed and rendered in local Chromium; exported images were visually inspected. The original bundle contained 74 files and 86 validated internal Markdown links; the refreshed release bundle adds branding evidence. Its manifest inventories the packaged files. The bundle excludes application source, dependencies, environment files and credentials; source links point to GitHub.

## Reproduce

Use README setup, stop an existing development server, then run typecheck, unit tests, evals, build and browser tests in that order. Run `npm run check:secrets` before packaging/publishing. This release includes the UI-state matrix and the web-app/ZIP-download regression together with the UI changes.
