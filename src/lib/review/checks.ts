import { createHash } from "node:crypto";
import type { Finding, Snapshot, SourceFile } from "./schema";
import { boundedResponse } from "./github";

export function redact(text: string) {
  return text.replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{15,}|github_pat_[A-Za-z0-9_]{15,}|AKIA[A-Z0-9]{16}|AIza[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9_-]{16,}|AQ\.[A-Za-z0-9_-]{20,})\b/g, "[REDACTED_CREDENTIAL]")
    .replace(/((?:api[_-]?key|secret|password|access[_-]?token)\s*[:=]\s*["'`])[^"'`\r\n]{8,}(["'`])/gi, "$1[REDACTED_CREDENTIAL]$2");
}
type Rule = { id: string; category: Finding["category"]; severity: Finding["severity"]; pattern: RegExp; title: string; why: string; fix: string; test: string };
const rules: Rule[] = [
  { id: "dynamic-evaluation", category: "security", severity: "high", pattern: /\b(?:eval\s*\(|new\s+Function\s*\()/, title: "Dynamic code evaluation needs input review", why: "The source contains dynamic code evaluation. Exploitability depends on whether untrusted input reaches this call.", fix: "Trace the input and replace evaluation with a constrained parser or explicit dispatch where possible.", test: "Add a regression test that untrusted text cannot execute code." },
  { id: "raw-html", category: "security", severity: "high", pattern: /dangerouslySetInnerHTML|\.innerHTML\s*=/, title: "Raw HTML rendering may expose an injection boundary", why: "HTML bypasses ordinary text escaping here. This pattern alone does not establish XSS.", fix: "Trace the data source; render text or use an appropriate maintained sanitizer and a restricted allowlist.", test: "Verify malicious HTML is not executed and intended formatting still renders." },
  { id: "shell-execution", category: "security", severity: "high", pattern: /\b(?:exec|execSync)\s*\(|shell\s*:\s*true|os\.system\s*\(/, title: "Shell execution requires argument validation", why: "A shell-capable execution pattern is present. User-controlled command construction could be unsafe.", fix: "Inspect call sites and prefer executable-plus-argument APIs without shell interpretation; constrain allowed actions.", test: "Test metacharacters and unexpected arguments without running destructive commands." },
  { id: "tls-disabled", category: "security", severity: "high", pattern: /rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0|verify\s*=\s*False/, title: "TLS certificate verification appears disabled", why: "The source includes a setting that can bypass certificate validation.", fix: "Remove the bypass from production paths and configure trusted certificates appropriately.", test: "Confirm a valid certificate succeeds and an untrusted certificate is rejected." },
  { id: "wildcard-cors", category: "security", severity: "medium", pattern: /(?:Access-Control-Allow-Origin|origin)["']?\s*[:,]\s*["']\*["']/, title: "Wildcard cross-origin policy needs review", why: "A broad CORS origin pattern is present; risk depends on the endpoint and credential policy.", fix: "Confirm intended callers and restrict origins for sensitive endpoints.", test: "Check allowed and disallowed origins, including credentialed requests." },
  { id: "missing-image-alt", category: "accessibility", severity: "medium", pattern: /<img\b(?:(?!\balt\s*=)[^>])*\/?\s*>/, title: "Image has no alt attribute in this source tag", why: "A single-line image tag lacks an alt attribute. Verify whether it is informative or decorative.", fix: "Provide meaningful alt text, or an empty alt attribute for a decorative image.", test: "Inspect accessible output with images disabled and a screen reader or accessibility checker." },
  { id: "outline-disabled", category: "accessibility", severity: "medium", pattern: /outline\s*:\s*(?:none|0)\s*[;}]/, title: "Focus outline is removed", why: "Removing the default outline can hide keyboard focus unless an equivalent indicator is supplied.", fix: "Verify and provide a visible focus-visible treatment with sufficient contrast.", test: "Tab through affected controls and confirm the current focus remains visible." },
  { id: "fixed-width", category: "ui", severity: "medium", pattern: /(?:^|[;{\s])(?:min-)?width\s*:\s*(?:[5-9]\d{2}|\d{4,})px\b/, title: "Large fixed width may overflow narrow screens", why: "A width or min-width of at least 500px appears in source. Container and responsive overrides determine actual behavior.", fix: "Inspect the containing layout and replace unnecessary fixed constraints with responsive sizing.", test: "Check at 360px, 390px and desktop widths; verify no unintended horizontal scrolling." },
  { id: "overflow-hidden", category: "ui", severity: "low", pattern: /overflow(?:-x)?\s*:\s*hidden/, title: "Hidden overflow may clip content or controls", why: "A clipping rule is present. It may be intentional and needs visual verification.", fix: "Check whether interactive or essential content is clipped; retain intentional decorative clipping.", test: "Test keyboard focus, narrow viewports, long content and 200% text zoom." },
  { id: "array-index-key", category: "functionality", severity: "medium", pattern: /\bkey=\{(?:index|idx|i)\}/, title: "Array-position key may destabilize stateful lists", why: "A list appears to use its position as the key. Reordering or deletion can associate state with the wrong item.", fix: "Use a stable unique item identifier where the list can change order.", test: "Test inserting, deleting and reordering items while preserving the correct item state." },
  { id: "empty-catch", category: "functionality", severity: "medium", pattern: /catch\s*(?:\([^)]*\))?\s*\{\s*\}/, title: "Empty catch may hide a failed operation", why: "An exception is discarded without visible handling in this source pattern.", fix: "Decide whether the failure is expected; add safe recovery or user-visible handling without leaking sensitive data.", test: "Trigger the failure and verify the intended recovery or error state." },
  { id: "disabled-test", category: "testing", severity: "low", pattern: /\b(?:it|test|describe)\.skip\s*\(/, title: "A test is explicitly skipped", why: "This test does not run in the normal suite.", fix: "Review why it was skipped and restore meaningful coverage when appropriate.", test: "Run the restored test and verify it fails for the corresponding regression." },
];
export function findingId(rule: string, path: string, line: number) { return `${rule}-${createHash("sha256").update(`${path}:${line}`).digest("hex").slice(0, 10)}`; }
export function makeFinding(rule: string, file: SourceFile, line: number, fields: Omit<Finding, "id" | "path" | "line" | "evidence" | "status" | "fixPrompt" | "focus">, quote = ""): Finding {
  const source = redact(file.content.split(/\r?\n/)[line - 1] ?? "");
  const start = Math.max(0, source.indexOf(quote ? redact(quote) : "[REDACTED_CREDENTIAL]") - 140);
  return { ...fields, id: findingId(rule, file.path, line), path: file.path, line, evidence: source.slice(start, start + 900), status: "needs-verification", fixPrompt: "", focus: "repository-review" };
}
export function staticChecks(snapshot: Snapshot): Finding[] {
  const found: Finding[] = [];
  for (const file of snapshot.files) {
    if (/lock\.json$/.test(file.path)) continue;
    const counts = new Map<string, number>();
    file.content.split(/\r?\n/).forEach((text, i) => {
      for (const rule of rules) {
        if (found.length >= 70 || (counts.get(rule.id) ?? 0) >= 2 || !rule.pattern.test(text)) continue;
        counts.set(rule.id, (counts.get(rule.id) ?? 0) + 1);
        found.push(makeFinding(rule.id, file, i + 1, { title: rule.title, category: rule.category, severity: rule.severity, source: "static-rule", explanation: rule.why, recommendation: rule.fix, verification: rule.test, confidence: "medium" }, rule.pattern.exec(text)?.[0]));
      }
      if (found.length < 70 && redact(text) !== text && !/\[REDACTED|replace\(|RegExp|pattern:/.test(text)) found.push(makeFinding("credential-pattern", file, i + 1, { title: "Possible embedded credential (value redacted)", category: "security", severity: "high", source: "static-rule", explanation: "This line matches a credential pattern. It may be a placeholder; verify without exposing its value.", recommendation: "If real, rotate the credential and remove it from source and history using the owner's approved procedure; use server-managed secrets.", verification: "Confirm the old credential is revoked and no secret is shipped to clients or committed.", confidence: "low" }));
    });
  }
  return found;
}
export type DependencyResult = { findings: Finding[]; packages: number; status: "checked" | "not-requested" | "no-supported-lockfile" | "unavailable"; warnings: string[] };
export async function dependencyChecks(snapshot: Snapshot, request: typeof fetch = fetch): Promise<DependencyResult> {
  const packages: { name: string; version: string; file: SourceFile; line: number; dev: boolean }[] = [];
  for (const file of snapshot.files.filter(f => /(?:^|\/)package-lock\.json$/.test(f.path))) {
    try {
      const lock = JSON.parse(file.content);
      for (const [path, item] of Object.entries(lock.packages ?? {})) {
        const entry = item as { name?: unknown; version?: unknown; dev?: boolean };
        const name = typeof entry.name === "string" ? entry.name : path.split("node_modules/").pop();
        if (!path.includes("node_modules/") || !name || typeof entry.version !== "string" || !/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(entry.version)) continue;
        if (packages.some(p => p.name === name && p.version === entry.version)) continue;
        packages.push({ name, version: entry.version, file, line: Math.max(1, file.content.split(/\r?\n/).findIndex(s => s.includes(JSON.stringify(path))) + 1), dev: Boolean(entry.dev) });
      }
    } catch { /* Invalid or unsupported lockfiles are not executable inputs. */ }
  }
  if (!packages.length) return { findings: [], packages: 0, status: "no-supported-lockfile", warnings: ["Dependency advisory checking currently supports exact versions in npm package-lock.json v2/v3 only; other ecosystems were not checked."] };
  const selected = packages.sort((a, b) => Number(a.dev) - Number(b.dev) || a.name.localeCompare(b.name)).slice(0, 200);
  const warnings = packages.length > 200 ? [`Only 200 of ${packages.length} distinct locked dependencies were checked against OSV.`] : [];
  try {
    const response = await request("https://api.osv.dev/v1/querybatch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ queries: selected.map(p => ({ package: { name: p.name, ecosystem: "npm" }, version: p.version })) }), redirect: "error", signal: AbortSignal.timeout(15_000), cache: "no-store" });
    if (!response.ok) throw new Error("OSV unavailable");
    const data = JSON.parse((await boundedResponse(response, 2_000_000)).toString());
    if (!Array.isArray(data.results) || data.results.length !== selected.length) throw new Error("Invalid OSV response");
    const findings: Finding[] = [];
    data.results.forEach((result: { vulns?: { id?: string }[] }, i: number) => {
      const ids = (result.vulns ?? []).map(v => v.id).filter((id): id is string => typeof id === "string" && /^[A-Za-z0-9_-]{3,100}$/.test(id));
      if (!ids.length || findings.length >= 20) return;
      const p = selected[i]!;
      findings.push(makeFinding(`dependency-${p.name}`, p.file, p.line, { title: `Advisory match: ${p.name}@${p.version}`, category: "security", severity: "medium", source: "osv", confidence: "high", explanation: `OSV matched the locked ${p.dev ? "development" : "production/unspecified"} dependency version to: ${ids.slice(0, 8).join(", ")}. This verifies an advisory/version match, not exploitability or advisory severity. Review https://osv.dev/vulnerability/${ids[0]}.`, recommendation: "Read the matching advisories and upgrade to a compatible patched version; inspect breaking changes and regenerate the lockfile without force-upgrading blindly.", verification: "Rerun dependency advisory checks, project tests and the production build. Establish whether the vulnerable behavior is reachable." }));
    });
    return { findings, packages: selected.length, status: "checked", warnings };
  } catch { return { findings: [], packages: 0, status: "unavailable", warnings: ["OSV could not be reached or validated. Dependency vulnerabilities were not established; this is not a clean security result."] }; }
}
export const STATIC_RULE_COUNT = rules.length + 1;
