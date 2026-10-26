import { readdir, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { allowedPath, ignoredDirectories, repositoryRoot, safeFile, fileHash, declaredSymbol, validatePaths } from "./validate-paths";
import { rankFile, fileKind, searchTerms } from "./rank";
import { RepositoryReportSchema, type RepositoryMatch, type RepositoryReport } from "../schema/evidence";
import { BugLensError } from "../errors";

export function repositoryFacts(matches: RepositoryMatch[]): RepositoryReport["facts"] {
  return matches.map((m, i) => ({ id: `repository_${i + 1}`, source: "repository", confidence: "high", claim: m.symbol ? `A declaration named ${m.symbol} exists in ${m.path} at line ${m.line}.` : `The file ${m.path} exists; its contents were read locally.`, evidence: `${m.path}:${m.line}; SHA-256 ${m.sha256}` }));
}
export function repositoryHypotheses(matches: RepositoryMatch[]): RepositoryReport["hypotheses"] {
  return matches.filter((m) => ["component", "style"].includes(m.kind)).slice(0, 3).map((m, i) => ({ id: `hypothesis_${i + 1}`, source: "hypothesis", confidence: "low", claim: `The layout or behavior associated with ${m.path} may be relevant to the reported symptom; this relationship is unverified.`, evidence: `Textual search overlap only: ${m.matchReason}`, }));
}

export async function scanRepository(root: string, text: string, options: { forceNode?: boolean } = {}): Promise<RepositoryReport> {
  const base = await repositoryRoot(root);
  let files: string[] = [], method: "rg" | "node" = "node";
  let limited = false;
  if (!options.forceNode) {
    try { files = execFileSync("rg", ["--files", "--null", "--glob", "!node_modules/**", "--glob", "!dist/**", "--glob", "!build/**"], { cwd: base, encoding: "utf8", timeout: 3000, maxBuffer: 1_000_000, stdio: ["ignore", "pipe", "ignore"] }).split("\0").filter(Boolean); method = "rg"; } catch { /* Deterministic Node fallback below. */ }
  }
  if (method === "node") {
    let visited = 0;
    async function walk(dir: string, depth: number) {
      if (depth > 12) { limited = true; return; }
      for (const entry of (await readdir(path.join(base, dir), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
        if (++visited > 5000) { limited = true; return; }
        if (entry.name.startsWith(".") || ignoredDirectories.has(entry.name) || entry.isSymbolicLink()) continue;
        const relative = path.posix.join(dir, entry.name);
        if (entry.isDirectory()) await walk(relative, depth + 1);
        else if (entry.isFile()) files.push(relative);
      }
    }
    try { await walk("", 0); } catch { throw new BugLensError("REPOSITORY_UNAVAILABLE", "The repository could not be enumerated."); }
  }
  const candidates = files.filter(allowedPath).sort();
  if (candidates.length > 2000) limited = true;
  const terms = searchTerms(text);
  const matches: RepositoryMatch[] = [];
  let scannedFiles = 0, totalBytes = 0;
  for (const relative of candidates.slice(0, 2000)) {
    let content: string;
    try { content = await readFile(await safeFile(base, relative), "utf8"); } catch { continue; }
    totalBytes += Buffer.byteLength(content);
    if (totalBytes > 4_000_000) { limited = true; break; }
    if (content.includes("\0")) continue;
    scannedFiles++;
    const rank = rankFile(relative, content, terms);
    if (rank.score === 0) continue;
    const lines = content.split(/\r?\n/);
    let index = lines.findIndex((line) => declaredSymbol(line));
    if (index < 0) index = Math.max(0, lines.findIndex((line) => terms.some((term) => line.toLowerCase().includes(term))));
    const excerpt = (lines[index] ?? "").slice(0, 600);
    const symbol = declaredSymbol(excerpt);
    matches.push({ path: relative, ...(symbol ? { symbol } : {}), matchReason: rank.terms.length ? `Matched text: ${rank.terms.join(", ")}. This establishes lexical overlap only.` : "Package metadata identifies the project scripts.", verified: true, relationship: "hypothesis", line: index + 1, excerpt, sha256: fileHash(content), score: rank.score, kind: fileKind(relative) });
  }
  const selected = matches.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path)).slice(0, 8);
  // Keep the package script provenance even when source terms dominate ranking.
  const metadata = matches.find((m) => m.kind === "metadata");
  if (metadata && !selected.includes(metadata)) selected.push(metadata);
  await validatePaths(base, selected);
  return RepositoryReportSchema.parse({ matches: selected, facts: repositoryFacts(selected), hypotheses: repositoryHypotheses(selected), searchTerms: terms, scannedFiles, method, limitations: ["Path and source text are verified; causal relationships are not.", ...(limited ? ["Scan limits were reached; some files were not inspected."] : []), ...(!selected.length ? ["No relevant source files matched the report."] : [])] });
}
