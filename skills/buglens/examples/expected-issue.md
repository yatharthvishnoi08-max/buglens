# The right side of the Continue action extends past the visible checkout area.

## Observed visual evidence

- The right side of the Continue action extends past the visible checkout area. (visual; high confidence)

## Reporter-provided facts

- Expected: Both checkout actions should remain visible without horizontal overflow. (reporter statement)
- Actual: On a 390px-wide viewport, the Continue button extends beyond the right side of the checkout page. Desktop appears normal. (reporter statement)
- Environment: Viewport: 390 × 844. Browser and operating system unknown. (reporter statement)

## Verified repository context

- `src/components/CheckoutActions.tsx` — file read and SHA-256 recorded; declaration `CheckoutActions` verified at line 2. This does not establish responsibility for the symptom.
- `src/pages/CheckoutPage.tsx` — file read and SHA-256 recorded; declaration `CheckoutPage` verified at line 4. This does not establish responsibility for the symptom.
- `src/styles/checkout.css` — file read and SHA-256 recorded. This does not establish responsibility for the symptom.
- `tests/checkout.test.ts` — file read and SHA-256 recorded; declaration `markup` verified at line 6. This does not establish responsibility for the symptom.
- `src/main.tsx` — file read and SHA-256 recorded; declaration `routes` verified at line 4. This does not establish responsibility for the symptom.
- `package.json` — file read and SHA-256 recorded. This does not establish responsibility for the symptom.
- `index.html` — file read and SHA-256 recorded. This does not establish responsibility for the symptom.

## Suspected causes — not verified

- The layout or behavior associated with src/components/CheckoutActions.tsx may be relevant to the reported symptom; this relationship is unverified. (low confidence)
- The layout or behavior associated with src/styles/checkout.css may be relevant to the reported symptom; this relationship is unverified. (low confidence)

## Unknown information

- Browser and operating system
- Browser zoom level
- Whether different label lengths change the symptom
- Whether a candidate source file caused the visible symptom

## Reproduction steps

1. After following the repository's installation instructions, start it with `npm run dev` (the script is declared in `package.json`; it has not been executed by BugLens).
2. Open `/checkout` (route mapping verified in `src/main.tsx`).
3. Set the viewport to 390 × 844, as supplied by the reporter.
4. Inspect the reported behavior: “On a 390px-wide viewport, the Continue button extends beyond the right side of the checkout page. Desktop appears normal.”

## Acceptance criteria

- [ ] Both checkout actions should remain visible without horizontal overflow.
- [ ] The reported symptom is absent at the supplied reproduction conditions.
- [ ] Relevant controls and keyboard focus remain fully visible and usable.
- [ ] The expected behavior remains intact at wider layouts.

## Suggested verification

- Inspect the existing test file `tests/checkout.test.ts`; BugLens has not executed it or established coverage.
- Proposed: add or extend a browser layout test for the supplied viewport, if known.
- Proposed: check 320 px, 390 px, and a desktop width, including keyboard focus. These are suggested test conditions, not observed environment facts.

## Evidence provenance

- Provider: SYNTHETIC FIXTURE MODE. Recorded evidence; no live model request.
- Visual: image observations, subject to model error. Reporter: supplied statements, not independently verified.
- Repository: local source reads with file and symbol verification. Hypothesis: unverified relevance only. Unknown: unresolved information.
- Validation checks schema, source classification and path provenance; it does not prove a root cause or visual truth.
- Inference boundary: The image does not establish implementation details or a root cause.
- Inference boundary: Image dimensions do not prove the browser viewport.
