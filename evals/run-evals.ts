import { readFile, writeFile } from "node:fs/promises";
import { runBugLens } from "../src/lib/run";
import { fixtureProvider, fixtureImagePath, fixtureRoot } from "../src/lib/gemma/fixture-provider";
import { fixtureCases, type FixtureId } from "../src/lib/fixtures/data";
import { ISSUE_SECTIONS } from "../src/lib/issue/validate";
import { publicError } from "../src/lib/errors";
const cases = JSON.parse(await readFile("evals/cases.json", "utf8")) as Array<{ id: FixtureId; outcome: string }>;
const results = [];
for (const testCase of cases) {
  let outcome = "success", checks = false;
  try {
    const result = await runBugLens({ image: await readFile(fixtureImagePath(testCase.id)), mimeType: "image/png", context: fixtureCases[testCase.id].context, root: fixtureRoot(), provider: fixtureProvider(testCase.id) });
    checks = result.metadata.provider === "fixture" && result.repositoryMatches.every((m) => m.verified) && ISSUE_SECTIONS.every((heading) => result.issueMarkdown.includes(`## ${heading}\n`)) && result.visualAnalysis.unknowns.length > 0 && (testCase.id !== "ambiguous" || result.visualAnalysis.evidence.some((e) => e.source === "visual" && e.confidence === "low"));
  } catch (error) { outcome = publicError(error).code; checks = outcome === testCase.outcome; }
  results.push({ case: testCase.id, provider: "fixture", outcome, passed: checks && outcome === testCase.outcome });
}
const report = { note: "Deterministic fixture checks only; four synthetic cases are not a model benchmark.", results };
await writeFile("evals/latest-results.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
if (results.some((r) => !r.passed)) process.exitCode = 1;
