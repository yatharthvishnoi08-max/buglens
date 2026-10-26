import { readFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { BugLensError } from "../errors";
import { RepositoryReportSchema, type RepositoryReport, type ReporterContext, type VisualAnalysis } from "../schema/evidence";
import { validateEvidence, reporterContext } from "../validate-evidence";
import { repositoryFacts, repositoryHypotheses } from "../repository/scan";
import { safeFile, validatePaths } from "../repository/validate-paths";
import { validateIssue, ISSUE_SECTIONS } from "./validate";

export function markdownText(text: string) { return text.replace(/[\r\n]+/g, " ").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/[\\`*_[\]#|]/g, "\\$&"); }
async function reproduction(root: string, repository: RepositoryReport, context: ReporterContext): Promise<string[]> {
  const steps: string[] = [];
  const packageMatch = repository.matches.find((m) => m.path === "package.json");
  if (packageMatch) {
    try {
      const pkg = JSON.parse(await readFile(await safeFile(root, packageMatch.path), "utf8"));
      if (typeof pkg.scripts?.dev === "string") steps.push("After following the repository's installation instructions, start it with `npm run dev` (the script is declared in `package.json`; it has not been executed by BugLens).");
    } catch (error) { if (error instanceof BugLensError) throw error; }
  }
  for (const match of repository.matches.filter((m) => m.kind === "route")) {
    const content = await readFile(await safeFile(root, match.path), "utf8");
    const route = content.match(/^\s*export\s+const\s+routes\s*=\s*{\s*["'](\/[a-zA-Z0-9/_-]+)["']\s*:\s*[A-Z][\w]*/m)?.[1];
    if (route) { steps.push(`Open \`${route}\` (route mapping verified in \`${match.path}\`).`); break; }
  }
  const supplied = Object.values(context).join(" ");
  const dimensions = supplied.match(/\b(\d{2,4})\s*[×x]\s*(\d{2,4})\b/);
  const width = supplied.match(/\b(\d{2,4})\s*px[- ]wide\b/i);
  if (dimensions) steps.push(`Set the viewport to ${dimensions[1]} × ${dimensions[2]}, as supplied by the reporter.`);
  else if (width) steps.push(`Set the viewport width to ${width[1]} px, as supplied by the reporter. The height is unspecified.`);
  steps.push(`Inspect the reported behavior: “${markdownText(context.actualBehavior)}”`);
  if (!steps.some((s) => s.startsWith("Open"))) steps.push("Route and navigation steps require reporter confirmation; no route was established by the inspected source.");
  return steps;
}

export async function compileIssue(input: { visualAnalysis: unknown; reporterContext: unknown; repository: unknown; root: string; provider: "gemma" | "fixture" }) {
  const context = reporterContext(input.reporterContext);
  const visual = validateEvidence(input.visualAnalysis, context);
  const parsed = RepositoryReportSchema.safeParse(input.repository);
  if (!parsed.success) throw new BugLensError("UNVERIFIED_FILE_REFERENCE", "Repository evidence does not match the verified-source contract.");
  const repository = parsed.data;
  await validatePaths(input.root, repository.matches);
  // Regenerate facts from the verified snapshot; caller-supplied free-form facts
  // and reclassified hypotheses are never accepted as authoritative.
  if (!isDeepStrictEqual(repository.facts, repositoryFacts(repository.matches)) || !isDeepStrictEqual(repository.hypotheses, repositoryHypotheses(repository.matches))) throw new BugLensError("HYPOTHESIS_LEAK", "Repository facts or hypotheses differ from the deterministic scanner output.");
  const sections = await sectionContent(input.root, visual, repository, context, input.provider);
  const symptom = visual.evidence.find((e) => e.source === "visual")!.claim;
  const title = symptom.charAt(0).toUpperCase() + symptom.slice(1);
  const markdown = `# ${markdownText(title).slice(0, 160)}\n\n` + ISSUE_SECTIONS.map((heading, i) => `## ${heading}\n\n${sections[i]}\n`).join("\n");
  const validation = await validateIssue(markdown, markdown, input.root, repository.matches);
  return { issueMarkdown: markdown, validation };
}
async function sectionContent(root: string, visual: VisualAnalysis, repository: RepositoryReport, context: ReporterContext, provider: "gemma" | "fixture") {
  const bullets = (items: string[]) => items.map((v) => `- ${v}`).join("\n");
  const visualLines = visual.evidence.filter((e) => e.source === "visual").map((e) => `${markdownText(e.claim)} (visual; ${e.confidence} confidence)`);
  const reporterLines = Object.entries(context).filter(([, v]) => v).map(([field, value]) => `${field === "expectedBehavior" ? "Expected" : field === "actualBehavior" ? "Actual" : "Environment"}: ${markdownText(value)} (reporter statement)`);
  const verified = repository.matches.map((m) => `\`${m.path}\` — file read and SHA-256 recorded${m.symbol ? `; declaration \`${m.symbol}\` verified at line ${m.line}` : ""}. This does not establish responsibility for the symptom.`);
  const hypotheses = repository.hypotheses.map((e) => `${markdownText(e.claim)} (${e.confidence} confidence)`);
  const unknowns = [...new Set([...visual.unknowns, ...visual.evidence.filter((e) => e.source === "unknown").map((e) => e.claim)])];
  const steps = await reproduction(root, repository, context);
  const tests = repository.matches.filter((m) => m.kind === "test").map((m) => `Inspect the existing test file \`${m.path}\`; BugLens has not executed it or established coverage.`);
  return [
    bullets(visualLines), bullets(reporterLines), bullets(verified.length ? verified : ["No relevant repository files were established."]),
    bullets(hypotheses.length ? hypotheses : ["No specific cause is proposed. Repository relevance has not been established."]),
    bullets(unknowns.map(markdownText)), steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
    [`- [ ] ${markdownText(context.expectedBehavior)}`, "- [ ] The reported symptom is absent at the supplied reproduction conditions.", "- [ ] Relevant controls and keyboard focus remain fully visible and usable.", "- [ ] The expected behavior remains intact at wider layouts."].join("\n"),
    bullets([...tests, "Proposed: add or extend a browser layout test for the supplied viewport, if known.", "Proposed: check 320 px, 390 px, and a desktop width, including keyboard focus. These are suggested test conditions, not observed environment facts."]),
    bullets([provider === "fixture" ? "Provider: SYNTHETIC FIXTURE MODE. Recorded evidence; no live model request." : "Provider: live Gemma 4 (gemma-4-26b-a4b-it) through the Gemini API.", "Visual: image observations, subject to model error. Reporter: supplied statements, not independently verified.", "Repository: local source reads with file and symbol verification. Hypothesis: unverified relevance only. Unknown: unresolved information.", "Validation checks schema, source classification and path provenance; it does not prove a root cause or visual truth.", ...visual.forbiddenInferences.map((text) => `Inference boundary: ${markdownText(text)}`)]),
  ];
}
