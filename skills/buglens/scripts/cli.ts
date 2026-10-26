import { readFile } from "node:fs/promises";
import path from "node:path";
import { runBugLens } from "../../../src/lib/run";
import { scanRepository } from "../../../src/lib/repository/scan";
import { compileIssue } from "../../../src/lib/issue/compile";
import { validateEvidence, reporterContext } from "../../../src/lib/validate-evidence";
import { validateImage } from "../../../src/lib/image";
import { liveProvider } from "../../../src/lib/gemma/live-provider";
import { fixtureProvider, fixtureRoot, fixtureImagePath } from "../../../src/lib/gemma/fixture-provider";
import { fixtureCases, type FixtureId } from "../../../src/lib/fixtures/data";
import { publicError } from "../../../src/lib/errors";

function arg(name: string) { const i = process.argv.indexOf(`--${name}`); return i < 0 ? undefined : process.argv[i + 1]; }
async function json(file: string | undefined) { if (!file) throw new Error("Missing JSON file argument"); return JSON.parse(await readFile(path.resolve(file), "utf8")); }
export async function cli(action: "analyze" | "scan" | "validate" | "compile") {
  try {
    if (process.argv.includes("--help")) { console.log("Run from the BugLens project or installed skill directory. --sample uses the labeled synthetic fixture. Live: --image screenshot.png --context reporter.json --repo /absolute/repo. Staged: --analysis analysis.json --repository repository.json. Credentials come only from GEMINI_API_KEY. See SKILL.md."); return; }
    const sample = process.argv.includes("--sample");
    const fixtureId = (arg("case") ?? "clipping") as FixtureId;
    if (!(fixtureId in fixtureCases)) throw new Error("Unknown case");
    const context = reporterContext(sample ? fixtureCases[fixtureId].context : await json(arg("context")));
    const root = sample ? fixtureRoot() : path.resolve(arg("repo") ?? ".");
    let output: unknown;
    if (action === "scan") output = await scanRepository(root, `${context.actualBehavior} ${context.expectedBehavior}`);
    else if (action === "validate") { const value = await json(arg("analysis")); output = validateEvidence(value.analysis ?? value, context); }
    else if (action === "compile" && arg("analysis")) {
      const value = await json(arg("analysis"));
      if (!["gemma", "fixture"].includes(value.metadata?.provider)) throw new Error("Staged compilation requires the analysis envelope with provider metadata");
      output = await compileIssue({ visualAnalysis: value.analysis, reporterContext: context, repository: await json(arg("repository")), root, provider: value.metadata.provider });
    }
    else {
      const imagePath = sample ? fixtureImagePath(fixtureId) : arg("image");
      if (!imagePath) throw new Error("Supply --image");
      const mimeType = /\.jpe?g$/i.test(imagePath) ? "image/jpeg" : /\.webp$/i.test(imagePath) ? "image/webp" : "image/png";
      const image = await readFile(imagePath);
      const provider = sample ? fixtureProvider(fixtureId) : liveProvider;
      output = action === "analyze" ? await provider.analyze({ image: await validateImage(image, mimeType), context }) : await runBugLens({ image, mimeType, context, root, provider });
    }
    if (process.argv.includes("--markdown") && output && typeof output === "object" && "issueMarkdown" in output) console.log(output.issueMarkdown);
    else console.log(JSON.stringify(output, null, 2));
  } catch (error) {
    console.error(JSON.stringify(publicError(error)));
    process.exitCode = 1;
  }
}
