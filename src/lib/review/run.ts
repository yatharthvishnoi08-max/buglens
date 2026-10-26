import { ReviewResultSchema, type Snapshot } from "./schema";
import { loadGitHubRepository } from "./github";
import { staticChecks, dependencyChecks, STATIC_RULE_COUNT, type DependencyResult } from "./checks";
import { codeReview } from "./model";
import { buildFixPrompt, compileDocuments } from "./report";
import { validateImage } from "../image";
import { reporterContext } from "../validate-evidence";
import { liveProvider } from "../gemma/live-provider";
import { rankFile, searchTerms } from "../repository/rank";
import { BugLensError } from "../errors";
import { problemInput, problemText } from "./inputs";
import { redact } from "./checks";

export type ReviewInput = { repositoryUrl: string; mode: "repository" | "problem"; includeAI: boolean; checkDependencies: boolean; problem?: unknown; image?: { bytes: Uint8Array; mimeType: string }; context?: unknown; onStage?: (message: string) => void };
export async function runRepositoryReview(input: ReviewInput, services: { load?: typeof loadGitHubRepository; model?: typeof codeReview; dependencies?: typeof dependencyChecks; visual?: typeof liveProvider.analyze } = {}) {
  const suppliedProblem = problemInput(input.problem);
  const reportedProblem = { text: redact(suppliedProblem.text), attachments: suppliedProblem.attachments.map(f => ({ name: f.name, text: redact(f.text) })) };
  const problem = problemText(reportedProblem);
  if (input.mode === "problem" && !input.image && !problem.trim()) throw new BugLensError("REPORTER_CONTEXT_REQUIRED", "Describe the problem, attach a supported text file, or supply a screenshot.");
  const image = input.image ? await validateImage(input.image.bytes, input.image.mimeType) : null;
  const context = image ? reporterContext(input.context) : null;
  input.onStage?.("Loading a fixed GitHub commit");
  const snapshot: Snapshot = await (services.load ?? loadGitHubRepository)(input.repositoryUrl);
  input.onStage?.(`Inspecting ${snapshot.files.length} source files with static checks`);
  const staticFindings = staticChecks(snapshot);
  input.onStage?.("Reviewing source, screenshot and dependency advisories as requested");
  const [ai, dependencies, visual] = await Promise.all([
    input.includeAI ? (services.model ?? codeReview)(snapshot, [problem, context?.actualBehavior, context?.expectedBehavior].filter(Boolean).join("\n")) : null,
    input.checkDependencies ? (services.dependencies ?? dependencyChecks)(snapshot) : Promise.resolve<DependencyResult>({ findings: [], packages: 0, status: "not-requested", warnings: [] }),
    image && context ? (services.visual ?? liveProvider.analyze)({ image, context }) : null,
  ]);
  input.onStage?.("Verifying evidence and building your report, documentation and fix prompts");
  const seen = new Set<string>();
  const priority = { high: 0, medium: 1, low: 2, info: 3 };
  const all = [...staticFindings, ...dependencies.findings, ...(ai?.findings ?? [])];
  const findings = all.filter(f => { const key = `${f.path}:${f.line}:${f.title}`; if (seen.has(key)) return false; seen.add(key); return true; }).sort((a, b) => priority[a.severity] - priority[b.severity] || a.path.localeCompare(b.path)).slice(0, 100).map(f => {
    const file = snapshot.files.find(s => s.path === f.path);
    if (!file || !file.content.split(/\r?\n/)[f.line - 1]) throw new BugLensError("UNVERIFIED_FILE_REFERENCE", "A review finding could not be linked to a source line.");
    return { ...f, focus: input.mode === "problem" && f.source === "gemma" ? "reported-problem" as const : "repository-review" as const, fixPrompt: buildFixPrompt(snapshot, [f], undefined, problem) };
  });
  const terms = searchTerms([problem, context?.actualBehavior, context?.expectedBehavior, visual?.analysis.summary].filter(Boolean).join(" "));
  const screenshotMatches = visual || problem ? snapshot.files.map(f => ({ path: f.path, rank: rankFile(f.path, f.content, terms) })).filter(f => f.rank.score > 0).sort((a, b) => b.rank.score - a.rank.score || a.path.localeCompare(b.path)).slice(0, 8).map(f => ({ path: f.path, reason: `Text overlap: ${f.rank.terms.join(", ") || "package metadata"}. Cause is unverified.` })) : [];
  const warnings = [
    "No repository code, install scripts, builds, tests or browsers were executed. Runtime behavior and exploitability remain unverified.",
    "Static rules are heuristic review leads with false positives and false negatives. A zero-finding result is not a clean security certificate.",
    "Output is capped at 70 static-rule findings (at most two matches per ordinary rule per file), eight AI findings and 20 dependency findings. Additional issues may be omitted; counts are not a complete defect inventory.",
    "Private repositories, remote execution and authenticated application testing are not implemented.",
    "Generated fix prompts must be reviewed and used in an authorized local checkout or isolated coding environment; they are not executable shell commands.",
    "Source inspection is limited to supported text files: 1,000 files, 8 MB total, 256 KB each (2 MB for package-lock.json), with a 20 MB compressed / 64 MB expanded archive cap.",
    ...dependencies.warnings,
    ...(snapshot.truncated ? ["The repository exceeded one or more inspection limits. Some eligible files were not inspected."] : []),
    ...(snapshot.sensitivePaths.length ? [`${snapshot.sensitivePaths.length} sensitive-looking file paths were skipped without reading their contents into the review.`] : []),
    ...(ai ? [`Gemma reviewed bounded excerpts of ${ai.files.length} files, at most 45,000 characters total; it did not review every source line. Common credentials were redacted, but automated redaction is not exhaustive.`] : ["AI code review was not requested. Source findings are from deterministic rules only."]),
  ];
  const result = {
    kind: "repository-review" as const, repository: snapshot.repository, mode: input.mode, reportedProblem, createdAt: new Date().toISOString(),
    summary: ai?.summary ?? `Static source review produced ${findings.length} findings to investigate across ${snapshot.files.length} inspected files. No runtime execution was performed.`, findings,
    coverage: { totalFiles: snapshot.totalFiles, eligibleFiles: snapshot.eligibleFiles, scannedFiles: snapshot.files.length, skippedFiles: snapshot.skippedFiles, bytes: snapshot.bytes, truncated: snapshot.truncated, aiFiles: ai?.files ?? [], dependencyPackages: dependencies.packages, dependencyStatus: dependencies.status },
    checks: [
      { category: "Source review", status: "reviewed" as const, detail: `${STATIC_RULE_COUNT} static rules across security, functionality, UI, accessibility and testing.` },
      { category: "Gemma code review", status: ai ? "limited" as const : "not-run" as const, detail: ai ? `${ai.files.length} source excerpts; file/line/quote references validated. Conclusions remain hypotheses.` : "Not requested." },
      { category: "Dependency security", status: dependencies.status === "checked" ? "limited" as const : "not-run" as const, detail: `${dependencies.packages} exact npm dependency versions checked; status: ${dependencies.status}.` },
      { category: "Visual analysis", status: visual ? "reviewed" as const : "not-run" as const, detail: visual ? "Gemma screenshot observations, reporter facts and unknowns kept separate. No running-browser verification." : "No screenshot supplied." },
      { category: "Runtime / tests / penetration testing", status: "not-run" as const, detail: "Requires approved isolated execution and, where relevant, test accounts. Nothing was executed on Vercel." },
      { category: "Test inventory", status: "limited" as const, detail: `${snapshot.files.filter(f => /(?:test|spec)/i.test(f.path)).length} included paths mention tests or specs; this is not measured test coverage.` },
      { category: "Performance / business logic / auth flows", status: "not-run" as const, detail: "No profiling, production traffic, account access or running-application behavior was inspected. Source patterns alone cannot verify these areas." },
    ],
    visualAnalysis: visual?.analysis ?? null, screenshotMatches,
    metadata: ai?.metadata ?? (visual ? { provider: "gemma" as const, model: visual.metadata.model, returnedModel: visual.metadata.returnedModel } : { provider: "static" as const, model: null, returnedModel: null }),
    warnings, validation: { valid: true as const, runtimeVerified: false as const },
  };
  return ReviewResultSchema.parse({ ...result, ...compileDocuments(result, snapshot) });
}
