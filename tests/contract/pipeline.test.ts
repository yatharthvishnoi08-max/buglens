import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { runBugLens } from "../../src/lib/run";
import { fixtureCases, fixtureAnalyses, sampleContext } from "../../src/lib/fixtures/data";
import { fixtureProvider, fixtureImagePath, fixtureRoot } from "../../src/lib/gemma/fixture-provider";
import { scanRepository } from "../../src/lib/repository/scan";
import { compileIssue } from "../../src/lib/issue/compile";
import { validateIssue, ISSUE_SECTIONS } from "../../src/lib/issue/validate";
import { validateImage } from "../../src/lib/image";
import { BugLensResultSchema } from "../../src/lib/schema/result";
export async function sample() { return runBugLens({ image: await readFile(fixtureImagePath("clipping")), mimeType: "image/png", context: sampleContext, root: fixtureRoot(), provider: fixtureProvider("clipping") }); }
describe("complete pipeline contract", () => {
  it("compiles all sections and never loses fixture provenance", async () => {
    const result = await sample(); expect(BugLensResultSchema.safeParse(result).success).toBe(true);
    expect([...result.issueMarkdown.matchAll(/^## (.*)$/gm)].map((m) => m[1])).toEqual(ISSUE_SECTIONS);
    expect(result.metadata.provider).toBe("fixture"); expect(result.issueMarkdown).toContain("SYNTHETIC FIXTURE MODE");
    expect(result.visualAnalysis.unknowns.length).toBeGreaterThan(0);
    expect(result.issueMarkdown).toContain("390 × 844, as supplied by the reporter");
  });
  it.each(["blurred", "unrelated"] as const)("rejects insufficient %s screenshot", async (id) => {
    await expect(runBugLens({ image: await readFile(fixtureImagePath(id)), mimeType: "image/png", context: fixtureCases[id].context, root: fixtureRoot(), provider: fixtureProvider(id) })).rejects.toMatchObject({ code: "INSUFFICIENT_VISUAL_EVIDENCE" });
  });
  it("preserves uncertainty in the ambiguous case", async () => {
    const result = await runBugLens({ image: await readFile(fixtureImagePath("ambiguous")), mimeType: "image/png", context: fixtureCases.ambiguous.context, root: fixtureRoot(), provider: fixtureProvider("ambiguous") });
    expect(result.visualAnalysis.evidence.some((e) => e.source === "visual" && e.confidence === "low")).toBe(true);
    expect(result.visualAnalysis.unknowns.some((s) => /actually clipped/.test(s))).toBe(true);
    expect(result.issueMarkdown.split("## Reproduction steps")[1]!.split("## Acceptance criteria")[0]).not.toContain("390");
  });
  it("rejects a fabricated path before it reaches the issue", async () => {
    const repository = await scanRepository(fixtureRoot(), "checkout"); repository.matches[0]!.path = "src/fake/Invented.tsx";
    await expect(compileIssue({ visualAnalysis: fixtureAnalyses.clipping, reporterContext: sampleContext, repository, root: fixtureRoot(), provider: "fixture" })).rejects.toMatchObject({ code: "UNVERIFIED_FILE_REFERENCE" });
  });
  it("rejects hypotheses disguised as repository facts", async () => {
    const repository = await scanRepository(fixtureRoot(), "checkout"); repository.facts[0]!.claim = "The flex layout definitely causes clipping.";
    await expect(compileIssue({ visualAnalysis: fixtureAnalyses.clipping, reporterContext: sampleContext, repository, root: fixtureRoot(), provider: "fixture" })).rejects.toMatchObject({ code: "HYPOTHESIS_LEAK" });
  });
  it("rejects Markdown modified after validated compilation", async () => {
    const result = await sample();
    await expect(validateIssue(result.issueMarkdown.replace("## Observed visual evidence", "## Something else"), result.issueMarkdown, fixtureRoot(), result.repositoryMatches)).rejects.toMatchObject({ code: "COMPILATION_FAILED" });
    await expect(validateIssue(result.issueMarkdown.replace("## Observed visual evidence", "## Observed visual evidence\n\nChrome is the cause."), result.issueMarkdown, fixtureRoot(), result.repositoryMatches)).rejects.toMatchObject({ code: "COMPILATION_FAILED" });
    await expect(validateIssue(result.issueMarkdown + "\n`Invented.tsx`", result.issueMarkdown, fixtureRoot(), result.repositoryMatches)).rejects.toMatchObject({ code: "UNVERIFIED_FILE_REFERENCE" });
  });
  it("does not use canned evidence for an unrelated upload or edited context", async () => {
    const wrongImage = await validateImage(await readFile(fixtureImagePath("unrelated")), "image/png");
    await expect(fixtureProvider("clipping").analyze({ image: wrongImage, context: sampleContext })).rejects.toMatchObject({ code: "MODEL_OUTPUT_INVALID" });
    const image = await validateImage(await readFile(fixtureImagePath("clipping")), "image/png");
    await expect(fixtureProvider("clipping").analyze({ image, context: { ...sampleContext, environment: "Chrome" } })).rejects.toMatchObject({ code: "MODEL_OUTPUT_INVALID" });
  });
  it("validates bytes and size rather than trusting a file extension", async () => {
    await expect(validateImage(Buffer.from("not PNG"), "image/png")).rejects.toMatchObject({ code: "INVALID_IMAGE" });
    await expect(validateImage(new Uint8Array(8 * 1024 * 1024 + 1), "image/png")).rejects.toMatchObject({ code: "IMAGE_TOO_LARGE" });
    await expect(validateImage(await readFile(fixtureImagePath("clipping")), "image/jpeg")).rejects.toMatchObject({ code: "INVALID_IMAGE" });
  });
});
