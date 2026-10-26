import { readFile, writeFile } from "node:fs/promises";
import { runBugLens } from "../src/lib/run";
import { liveProvider } from "../src/lib/gemma/live-provider";
import { fixtureImagePath, fixtureRoot } from "../src/lib/gemma/fixture-provider";
import { sampleContext } from "../src/lib/fixtures/data";
import { publicError } from "../src/lib/errors";
// This script only handles the checked-in synthetic sample, never user uploads.
try {
  const result = await runBugLens({ image: await readFile(fixtureImagePath("clipping")), mimeType: "image/png", context: sampleContext, root: fixtureRoot(), provider: liveProvider });
  const report = { scope: "One live Gemma 4 run on the synthetic clipped-checkout example; not a benchmark.", result };
  await writeFile("docs/live-check.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ liveRequestCompleted: true, metadata: result.metadata, validation: result.validation, verifiedFiles: result.repositoryMatches.length, visual: result.visualAnalysis.evidence.filter((e) => e.source === "visual").map((e) => e.claim) }, null, 2));
} catch (error) { console.error(JSON.stringify(publicError(error))); process.exitCode = 1; }
