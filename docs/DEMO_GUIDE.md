# Repeatable BugLens demonstration

## Starting points

- Local redesigned UI: `http://127.0.0.1:3000/demo` after README setup.
- [Published workspace](https://buglens-rust.vercel.app/demo): prior release, not this uncommitted redesign.
- Repository: `https://github.com/yatharthvishnoi08-max/buglens`.
- Static review requires GitHub connectivity; AI needs server credentials and quota; OSV needs connectivity.
- Keep credentials off screen. Pre-run a static review and retain its downloaded report before recording. Ninety seconds is a presentation plan, not guaranteed processing latency.

## 90-second sequence

| Time | Action | Explain / verify |
| --- | --- | --- |
| 0-15s | Enter the BugLens repository | Repository first; broad review or a reported problem |
| 15-30s | Select broad review; show optional text, file and screenshot inputs | Supported formats, not arbitrary binary files |
| 30-45s | Disable Gemma and dependency checks; keep screenshots off; analyze | Real GitHub static review; no repository execution |
| 45-65s | Open a finding and its evidence/verification details; show coverage | A source match is a lead, not a proven bug |
| 65-90s | Show Full report, Documentation and Fix prompt; download one | An authorized agent can investigate; no automatic repair |

Wait for real completion. If fetching exceeds the window, explicitly show the pre-downloaded report and identify its commit/date. Do not edit a failure into apparent success.

## Synthetic reported-problem input

Choose **Investigate a reported problem** and paste:

> Synthetic demonstration: a checkout action appears clipped at a narrow viewport. Expected: all actions remain visible and keyboard reachable. Actual: the right action is outside the visible area. This is an example symptom, not a claim about this repository.

An optional `error.log` attachment can contain:

```text
SYNTHETIC DEMO INPUT
viewport=375x900
reported_symptom=checkout action outside visible container
```

Static-only findings remain broad leads; do not claim they explain the symptom. A screenshot invokes live visual analysis even when source AI is unchecked, so omit it for a no-key real-repository demonstration.

## Failure demonstration

Submit with an empty URL: required-field validation prevents submission. Then use a valid URL, select problem mode and leave text/files/screenshot empty: the UI requests evidence. Correct the input and retry; no real data must be deleted.

An explicit AI error is not a completed review. Disable source AI **and** screenshots to retry static-only. OSV failure may produce a partial report with dependency coverage unavailable.

## Labeled offline fallback

Open `/demo?sample=clipping` or **Try the sample bug**, with `DEMO_MODE=fixture`. Keep **Synthetic fixture mode** visible. Generate the issue draft and download Markdown. This runs the local sample pipeline with pre-authored model output; it is not live inference or fetched-repository review.

The existing `docs/demo.gif` depicts an older screenshot workflow, not the redesigned repository interface.

## Reset and troubleshooting

- Download before refreshing: refresh clears memory-only results. There is no user database to delete.
- Use workspace navigation / New review to restart.
- Invalid/private URL: use HTTPS and an accessible public GitHub repository. Private-repo login is not implemented.
- GitHub rate limit: retry later; show the labeled fallback if needed.
- Model unavailable/invalid output: report the error honestly and check server configuration/quota privately. Never substitute another model.
- Unsupported file: provide readable UTF-8 text or a supported screenshot; do not rename a binary file.
- No findings: review scope/exclusions. Zero findings does not prove correctness or security.
- Live UI differs: these local changes are not published. See [handoff](UI_HANDOFF.md).

[Verification scope](TEST_REPORT.md) · [Architecture](architecture.md)
