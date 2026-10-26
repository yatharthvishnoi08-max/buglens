import { z } from "zod";
import { mkdir, writeFile, copyFile, readFile } from "node:fs/promises";
import { VisualAnalysisSchema, RepositoryReportSchema } from "../src/lib/schema/evidence";
import { ReviewResultSchema } from "../src/lib/review/schema";
import { fixtureCases, fixtureAnalyses, type FixtureId } from "../src/lib/fixtures/data";
import { runBugLens } from "../src/lib/run";
import { fixtureProvider, fixtureRoot, fixtureImagePath } from "../src/lib/gemma/fixture-provider";
for (const dir of ["skills/buglens/schemas", "skills/buglens/evals", "fixtures/expected"]) await mkdir(dir, { recursive: true });
for (const [name, schema] of [["visual-evidence", VisualAnalysisSchema], ["repository-evidence", RepositoryReportSchema], ["repository-review", ReviewResultSchema]] as const) await writeFile(`skills/buglens/schemas/${name}.schema.json`, JSON.stringify(z.toJSONSchema(schema), null, 2) + "\n");
for (const id of Object.keys(fixtureCases) as FixtureId[]) {
  await writeFile(`fixtures/expected/${id}-context.json`, JSON.stringify(fixtureCases[id].context, null, 2) + "\n");
  await writeFile(`fixtures/expected/${id}-analysis.json`, JSON.stringify(fixtureAnalyses[id], null, 2) + "\n");
}
const result = await runBugLens({ image: await readFile(fixtureImagePath("clipping")), mimeType: "image/png", context: fixtureCases.clipping.context, root: fixtureRoot(), provider: fixtureProvider("clipping") });
await writeFile("skills/buglens/examples/expected-issue.md", result.issueMarkdown);
await writeFile("fixtures/expected/clipping-result.json", JSON.stringify(result, null, 2) + "\n");
await copyFile("evals/cases.json", "skills/buglens/evals/cases.json");
console.log("Exported schemas and synthetic expected outputs from the implementation.");
