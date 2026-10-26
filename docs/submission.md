# BugLens submission notes

**Tagline:** Turn visual symptoms into repository-ready issues.

**Best Open-Source AI Project:** The main artifact is an independently usable agent skill with executable scripts, generated JSON schemas, a portable runtime, a synthetic repository, negative test cases and an Apache 2.0 license. The Next.js demonstration uses the exact same core pipeline.

**Best Use of Gemma 4:** The only live model is `gemma-4-26b-a4b-it`, through `@google/genai`. Gemma performs image-and-text evidence extraction, including visible symptoms, reporter statements, uncertainty and inference boundaries. Deterministic local tools handle repository verification and Markdown compilation. The provider is central to the live visual workflow and is not used for generic chat.

## Two-minute demo

1. Show the installed skill and run `npm run skill:sample -- --markdown`. Identify the fixture provenance label.
2. Open the website, choose the clipped checkout sample, and generate a draft. Show the visual, reporter, repository, hypothesis and unknown categories.
3. Show that the viewport remains reporter evidence and that source relevance is unverified even when a file exists.
4. Download the Markdown and open the skill's generated example.
5. Select Live Gemma 4, consent to external processing, and submit the synthetic image. Show the actual provider metadata. If the API fails, show that failure honestly; use the earlier live test record only as historical evidence.
6. Run `npm test` and show the fabricated-path and hypothesis-leak tests. Select the blurred sample and show the explicit insufficient-evidence error.

## Evidence and limits

See `docs/verification.md` for the verified command results, `docs/demo.gif` for the recorded synthetic journey, and `evals/latest-results.json` for deterministic fixture results. The early live experiment required a simpler output prompt and a more visibly clipped synthetic fixture. Subtle clipping was initially classified as insufficient evidence. Do not present fixture results as evidence of live model accuracy, claim a measured quality improvement, or describe BugLens as a root-cause detector.

Hosting is deployment-ready, with local production verification. No public deployment or GitHub repository URL has been created in this workspace. Publish through the team's hosting and GitHub accounts as part of submission; never include `.env.local` in a source upload. Award eligibility remains subject to the organizer's rules.
