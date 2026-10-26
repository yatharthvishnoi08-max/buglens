# UI integration handoff

## Scope and direction

The UI was developed on `ui-antigravity` from base `7d1847f314a15a41b08331cdd2b5d334079e60c2`. On 26 October 2026 the user authorized publishing the UI redesign, refreshed logo and web-app/download wording together, superseding the earlier local-only hold. This source release integrates that work with the previously published documentation. GitHub publication and Vercel deployment remain separate steps.

The website-design workflow informed a restrained presentation-led interface: paper background, deep-green primary actions, readable type, labeled product preview and progressive disclosure. Existing shared SVG icons remain; no added image/font dependency.

## Pages and components

| Area | Change |
| --- | --- |
| Landing | Product preview, three-step story, repository/sample entry points |
| Workspace | Repository, scope and checks sequence; outputs/privacy aside |
| Synthetic sample | Clear synthetic identity and real-workspace link |
| Results | Findings/report/documentation/prompt tabs, compact expandable coverage notes and investigation details |
| Guide | Anchored workflow, coverage, web-app/optional ZIP downloads and privacy sections |
| Brand and entry points | Shared SVG logo/favicon, browser-first call to action, no-installation message; skill ZIP explicitly not an app installer |
| Empty/loading/error/not-found | Consistent presentation and recovery controls |
| Shared | SiteNavigation, FeedbackBanner, ReviewProgress, RepositoryWorkspaceView, DemoWorkspaceView, ProblemInputView |

Primary files are `src/app/globals.css`, the route files in `src/app`, and presentation components in `src/components`. Workspace containers retain state, callbacks, fetch and parsing; extracted View components receive props.

## Tokens and responsiveness

Tokens in `globals.css`: paper #f6f8f5, ink #172f27, green #176448, lime #dcedaa; shared semantic colors; 4/8/12/16/24/32/48/64 spacing scale; 12px panels and 7px controls. System-font stack; 16px input text; primary controls at least 48px high. Breakpoints: 1100, 850 and 600px. Columns collapse in reading order; long paths/artifacts wrap.

## Accessibility

Skip link, semantic landmarks, input labels, visible focus, announced progress/errors, native controls, main action touch targets and reduced-motion CSS. Source/Markdown panels are keyboard-focusable. A UI-only animation-frame adjustment preserves result-heading visibility after the route transition.

Selected contrast ratios: body/paper 13.36:1; secondary/white 5.49:1; white/primary 7.11:1; error/background 6.44:1; warning/background 6.38:1. These measurements are not a complete WCAG audit. Screen readers, every color pair and cross-browser behavior remain unverified.

## Contracts and fixtures

No changes to `src/app/api`, `src/lib`, `src/model`, schemas, dependencies, environment variables, deployment configuration or artifact compiler. Multipart field names, endpoint paths, response parsing and callbacks remain unchanged. Existing artifact strings are displayed unchanged.

Loading, error, partial coverage, long-path and empty-filter fixtures exist only in `tests/e2e/ui-states.spec.ts`. No fixture was inserted into production repository review. The separate existing sample remains synthetic.

## Integration

1. Review `git diff` on this branch, including framework-generated `AGENTS.md` guidance and evidence assets. Preserve unrelated work.
2. Run `npm run typecheck`, `npm test`, `npm run evals`, `npm run build`, `npm run test:e2e`, `npm run check:secrets`.
3. Verify API/model/config paths have no unintended changes. Resolve conflicts against actual contracts.
4. Inspect screenshots and add official challenge requirements plus confirmed team contributions.
5. With approval, commit/merge. Suggested message: `feat(ui): refine review workspace and add verified submission docs`.
6. Rebuild downloadable distributions if publishing this version; test the extracted ZIPs. Deploy through the approved process and smoke-test the public URL. Update release labels only after publication.

See [test report](TEST_REPORT.md) and [screenshots](assets/ui). Request loading/error states were tested; the route-level error boundary/loading fallback were not separately fault-injected. No new successful live source-AI test, exhaustive security audit, fresh distributable install or formal assistive-technology certification is claimed.
