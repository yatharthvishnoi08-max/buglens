# BugLens demo guide
**Tagline:** Review your code. Understand the evidence. Plan the fix.

[Live demo](https://buglens-rust.vercel.app/demo) · [Source](https://github.com/yatharthvishnoi08-max/buglens)

## Two-minute product walkthrough
1. Open the demo and add a public GitHub repository. The **Use BugLens’s own repository** button is a quick starting point.
2. Choose **Repository-wide review**. Show the optional text/file inputs, Gemma 4 review, npm advisory check and optional screenshot. Explain that this is a static source review—not execution of an arbitrary repository.
3. Enable the desired external services, accept the processing notice and click **Analyze repository**. Allow time for GitHub and model responses.
4. Show findings with exact source links and verification targets. Show **What was actually checked**, including skipped or unperformed runtime checks.
5. Open **Full report**, **Documentation**, and **Fix prompt**. Download an artifact. Explain that the prompt goes into a coding agent in an authorized checkout; it is not a terminal command or guaranteed fix.
6. For a focused demonstration choose **Investigate a reported problem**, describe a real symptom and attach relevant logs/code or a screenshot. The resulting prompt includes that problem; general repository findings remain separately labeled.

For a reliable no-key walkthrough, deselect Gemma and dependency checking and run static review. Label this as static-only. For offline synthetic evidence, choose the separate **Try the sample bug** path and keep the synthetic badge visible. Never present synthetic output as a live repository/model result.

## Reusable skill demonstration
Show `skills/buglens/SKILL.md`, the bundled executable scripts and generated schemas. Run `npm run skill:review -- --github https://github.com/owner/repo --artifact report`. The website and skill share the same pipeline. The skill ZIP runs independently after installing its runtime dependencies.

## Gemma role
The only live model is `gemma-4-26b-a4b-it`, called through the Gemini API transport. It provides source-level review and optional multimodal screenshot analysis. Deterministic validators check source references and provenance; they do not prove the conclusions.

## Recording tips and limits
Record the production URL, not a protected Vercel preview URL. Keep credentials and environment files off screen. Do not cut an API failure into a fake success; show the explicit error or a clearly labeled earlier successful recording. Download reports before refreshing.

See [verification](verification.md) for test evidence. Existing screenshot-demo recordings show the older synthetic workflow, not the expanded repository review. The hackathon entry itself has not been submitted, and eligibility remains the organizer's decision.
