import type { ReporterContext, VisualAnalysis } from "../schema/evidence";
export const sampleContext: ReporterContext = {
  expectedBehavior: "Both checkout actions should remain visible without horizontal overflow.",
  actualBehavior: "On a 390px-wide viewport, the Continue button extends beyond the right side of the checkout page. Desktop appears normal.",
  environment: "Viewport: 390 × 844. Browser and operating system unknown.",
};
export const fixtureCases = {
  clipping: { name: "Clipped checkout action", image: "clipping.png", context: sampleContext },
  ambiguous: { name: "Ambiguous action spacing", image: "ambiguous.png", context: { ...sampleContext, actualBehavior: "The checkout actions appear crowded. I cannot tell whether the right edge is cut off.", environment: "Browser, operating system and viewport unknown." } },
  unrelated: { name: "Unrelated image", image: "unrelated.png", context: sampleContext },
  blurred: { name: "Unreadable screenshot", image: "blurred.png", context: sampleContext },
} as const;
export type FixtureId = keyof typeof fixtureCases;
export const fixtureAnalyses: Record<FixtureId, VisualAnalysis> = {
  clipping: {
    status: "sufficient", summary: "Checkout action is clipped at the right edge",
    evidence: [{ id: "visual_1", source: "visual", claim: "The right side of the Continue action extends past the visible checkout area.", evidence: "At the lower right, the colored action continues beyond the image boundary.", confidence: "high" }],
    unknowns: ["Browser and operating system", "Browser zoom level", "Whether different label lengths change the symptom"],
    forbiddenInferences: ["The image does not establish implementation details or a root cause.", "Image dimensions do not prove the browser viewport."],
  },
  ambiguous: {
    status: "sufficient", summary: "Checkout actions appear crowded",
    evidence: [{ id: "visual_1", source: "visual", claim: "The two checkout actions are close together; the screenshot does not clearly establish clipping.", evidence: "The action labels are readable, but their proximity leaves the reported boundary uncertain.", confidence: "low" }],
    unknowns: ["Whether the action is actually clipped", "Browser and operating system", "Viewport and zoom level"], forbiddenInferences: ["Crowded controls alone do not establish a layout defect or a cause."],
  },
  unrelated: { status: "insufficient", summary: "No software interface is visible", evidence: [], unknowns: ["The reported interface"], forbiddenInferences: ["A bug cannot be inferred from the reporter text alone."] },
  blurred: { status: "insufficient", summary: "The image is too unclear to assess", evidence: [], unknowns: ["The appearance of the reported action"], forbiddenInferences: ["The reporter description is not visual evidence."] },
};
