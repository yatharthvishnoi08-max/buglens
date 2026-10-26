import { readFile } from "node:fs/promises";
import { runRepositoryReview } from "../../../src/lib/review/run";
import { publicError } from "../../../src/lib/errors";
import { GemmaError } from "../../../src/model/gemma-client";
function arg(name: string) { const i = process.argv.indexOf(`--${name}`); return i < 0 ? undefined : process.argv[i + 1]; }
try {
  if (process.argv.includes("--help")) console.log("Public repository review: --github https://github.com/owner/repo [--ai] [--dependencies] [--allow-external] [--text 'problem description' | --problem-file problem.txt] [--image screenshot.png --context reporter.json] [--artifact report|documentation|prompt]. Default is static checks with JSON output. No repository code is executed.");
  else {
    const repositoryUrl = arg("github"), imagePath = arg("image"), contextPath = arg("context"), problemPath = arg("problem-file"), text = arg("text") ?? "";
    if (!repositoryUrl) throw new Error("Supply --github https://github.com/owner/repo");
    const includeAI = process.argv.includes("--ai"), checkDependencies = process.argv.includes("--dependencies");
    if ((includeAI || checkDependencies || imagePath) && !process.argv.includes("--allow-external")) throw new Error("External processing requires --allow-external after reviewing the privacy notice in SKILL.md.");
    const result = await runRepositoryReview({ repositoryUrl, mode: imagePath || problemPath || text ? "problem" : "repository", includeAI, checkDependencies, problem: { text: problemPath ? [text, await readFile(problemPath, "utf8")].filter(Boolean).join("\n\n") : text, attachments: [] }, ...(imagePath ? { image: { bytes: await readFile(imagePath), mimeType: /\.jpe?g$/i.test(imagePath) ? "image/jpeg" : /\.webp$/i.test(imagePath) ? "image/webp" : "image/png" }, context: contextPath ? JSON.parse(await readFile(contextPath, "utf8")) : undefined } : {}) });
    const artifact = arg("artifact");
    if (artifact && !["report", "documentation", "prompt"].includes(artifact)) throw new Error("Choose --artifact report, documentation, or prompt.");
    console.log(artifact === "report" ? result.reportMarkdown : artifact === "documentation" ? result.documentationMarkdown : artifact === "prompt" ? result.fixPrompt : JSON.stringify(result, null, 2));
  }
} catch (error) { console.error(JSON.stringify(error instanceof GemmaError ? { code: error.code, message: error.message } : error instanceof Error && !("code" in error) ? { code: "REVIEW_FAILED", message: error.message } : publicError(error))); process.exitCode = 1; }
