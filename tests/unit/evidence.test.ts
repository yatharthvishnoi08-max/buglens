import { describe, it, expect } from "vitest";
import { validateEvidence } from "../../src/lib/validate-evidence";
import { fixtureAnalyses, sampleContext } from "../../src/lib/fixtures/data";
describe("evidence provenance", () => {
  it.each([{}, null, { summary: "A screenshot" }, { ...fixtureAnalyses.clipping, extra: "ignored?" }])("rejects invalid or extra model fields", (value) => expect(() => validateEvidence(value, sampleContext)).toThrow());
  it.each(["CSS flex-wrap is nowrap", "Chrome renders a clipped action", "The viewport is 390px", "src/components/Invented.tsx causes this", "The action is clipped because its container is too small", "The component is responsible for this"])("rejects unsupported visual claims: %s", (claim) => {
    const model = structuredClone(fixtureAnalyses.clipping); model.evidence[0]!.claim = claim;
    expect(() => validateEvidence(model, sampleContext)).toThrow(expect.objectContaining({ code: "HYPOTHESIS_LEAK" }));
  });
  it("rejects a hypothesis falsely inserted by the visual extractor", () => {
    const value = { ...fixtureAnalyses.clipping, evidence: [{ ...fixtureAnalyses.clipping.evidence[0], source: "hypothesis" }] };
    expect(() => validateEvidence(value, sampleContext)).toThrow(expect.objectContaining({ code: "HYPOTHESIS_LEAK" }));
  });
  it("preserves exact reporter fields and provenance", () => {
    const value = validateEvidence(fixtureAnalyses.clipping, sampleContext);
    expect(value.evidence.filter((e) => e.source === "reporter").map((e) => e.claim)).toEqual(Object.values(sampleContext));
    expect(value.evidence.filter((e) => e.source === "visual").every((e) => !/390|844/.test(e.claim))).toBe(true);
  });
  it("cannot invent environment facts as reporter quotes", () => {
    const model = structuredClone(fixtureAnalyses.clipping); model.evidence.push({ id: "invented_browser", source: "reporter", claim: "Chrome on Windows", evidence: "Chrome on Windows", confidence: "high" });
    expect(() => validateEvidence(model, sampleContext)).toThrow(expect.objectContaining({ code: "MODEL_OUTPUT_INVALID" }));
  });
  it("keeps missing information unknown and is idempotent", () => {
    const value = validateEvidence(fixtureAnalyses.clipping, { ...sampleContext, environment: "" });
    expect(value.unknowns.some((s) => /browser/i.test(s))).toBe(true);
    expect(value.evidence.some((e) => e.source === "reporter" && /browser|operating system/i.test(e.claim))).toBe(false);
    expect(validateEvidence(value, { ...sampleContext, environment: "" })).toEqual(value);
  });
  it("rejects duplicate identifiers", () => {
    const model = structuredClone(fixtureAnalyses.clipping); model.evidence.push(model.evidence[0]!);
    expect(() => validateEvidence(model, sampleContext)).toThrow(expect.objectContaining({ code: "MODEL_OUTPUT_INVALID" }));
  });
});
