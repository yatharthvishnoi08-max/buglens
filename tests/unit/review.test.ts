import { describe, expect, it, vi } from "vitest";
import { gzipSync } from "node:zlib";
import { pack } from "tar-stream";
import { parseGitHubUrl, parseArchive, safeReviewPath, boundedResponse, loadGitHubRepository } from "../../src/lib/review/github";
import { staticChecks, dependencyChecks, redact } from "../../src/lib/review/checks";
import { modelFiles, verifyModelFindings, parseCodeReviewOutput, codeReview } from "../../src/lib/review/model";
import { problemInput } from "../../src/lib/review/inputs";
import { runRepositoryReview } from "../../src/lib/review/run";
import type { Snapshot } from "../../src/lib/review/schema";

const snapshot: Snapshot = { repository: { owner: "example", name: "app", url: "https://github.com/example/app", branch: "main", commit: "a".repeat(40) }, files: [{ path: "src/payment.ts", content: "export const evaluate = (input) => eval(input);\n", sha256: "hash" }, { path: "src/style.css", content: ".actions { min-width: 600px; overflow: hidden; }", sha256: "css" }], totalFiles: 2, eligibleFiles: 2, skippedFiles: 0, sensitivePaths: [], truncated: false, bytes: 100 };
async function archive(entries: { name: string; content?: string; type?: "file" | "symlink" }[]) {
  const tar = pack(); const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => { tar.on("data", c => { if (Buffer.isBuffer(c)) chunks.push(c); }); tar.on("end", () => resolve(gzipSync(Buffer.concat(chunks)))); tar.on("error", reject); });
  for (const entry of entries) tar.entry({ name: entry.name, type: entry.type ?? "file", ...(entry.type === "symlink" ? { linkname: "/etc/passwd" } : {}) }, entry.content ?? "");
  tar.finalize(); return done;
}
describe("bounded public repository importer", () => {
  it("selectively imports large repositories without downloading assets or symlinks", async () => {
    const request = vi.fn().mockResolvedValueOnce(Response.json({ private: false, default_branch: "main", size: 90000 })).mockResolvedValueOnce(Response.json({ sha: "b".repeat(40) })).mockResolvedValueOnce(Response.json({ truncated: true, tree: [
      { path: "src/app.ts", type: "blob", mode: "100644", size: 2 },
      { path: "movie.mp4", type: "blob", mode: "100644", size: 90000000 },
      { path: "src/link.ts", type: "blob", mode: "120000", size: 2 },
      { path: "../escape.ts", type: "blob", mode: "100644", size: 2 },
    ] })).mockResolvedValueOnce(new Response("ok"));
    const result = await loadGitHubRepository(snapshot.repository.url, request);
    expect(result.files.map(f => f.path)).toEqual(["src/app.ts"]);
    expect(result.truncated).toBe(true);
    expect(result.importNote).toContain("lower bounds");
    expect(request.mock.calls[3]![0]).toBe(`https://raw.githubusercontent.com/example/app/${"b".repeat(40)}/src/app.ts`);
    expect(request.mock.calls.some(c => c[0].includes("codeload"))).toBe(false);
  });
  it("falls back to selective import when archive content-length exceeds the limit", async () => {
    const request = vi.fn().mockResolvedValueOnce(Response.json({ private: false, default_branch: "main" })).mockResolvedValueOnce(Response.json({ sha: "b".repeat(40) })).mockResolvedValueOnce(new Response("oversized", { headers: { "content-length": "30000000" } })).mockResolvedValueOnce(Response.json({ tree: [{ path: "app.ts", type: "blob", mode: "100644", size: 2 }] })).mockResolvedValueOnce(new Response("ok"));
    const result = await loadGitHubRepository(snapshot.repository.url, request);
    expect(result.files).toHaveLength(1);
    expect(result.importNote).toContain("selective import");
  });
  it("normalizes a public GitHub repository", () => expect(parseGitHubUrl("https://github.com/example/app.git").url).toBe(snapshot.repository.url));
  it.each(["http://github.com/example/app", "https://localhost/example/app", "https://github.com.evil.test/a/b", "https://user:pass@github.com/a/b", "https://github.com/a/b?token=x", "https://github.com/a/b/tree/main", "https://127.0.0.1/a/b", "https://github.com/a/b#fragment"])("rejects unsupported URL %s", input => expect(() => parseGitHubUrl(input)).toThrow());
  it("rejects unsafe paths and never follows symlinks or includes secret/build files", async () => {
    const parsed = await parseArchive(await archive([{ name: "root/src/app.ts", content: "export const x = 1;" }, { name: "root/../escape.ts", content: "bad" }, { name: "root/.env.local", content: "SECRET=value" }, { name: "root/node_modules/lib/index.js", content: "bad" }, { name: "root/src/link.ts", type: "symlink" }, { name: "root/src/binary.ts", content: "a\u0000b" }]));
    expect(parsed.files.map(f => f.path)).toEqual(["src/app.ts"]); expect(parsed.sensitivePaths).toEqual([".env.local"]); expect(parsed.skippedFiles).toBe(5);
    for (const path of ["/absolute.ts", "../bad.ts", "a\\bad.ts", "a/./b.ts", "a\u0000b"]) expect(safeReviewPath(path)).toBe(false);
  });
  it("discloses per-file truncation", async () => { const parsed = await parseArchive(await archive([{ name: "root/huge.ts", content: "x".repeat(256001) }])); expect(parsed.truncated).toBe(true); expect(parsed.files).toHaveLength(0); });
  it("rejects invalid and oversized compressed data", async () => { await expect(parseArchive(Buffer.from("not gzip"))).rejects.toThrow(); await expect(parseArchive(Buffer.alloc(20 * 1024 * 1024 + 1))).rejects.toThrow(); });
  it("bounds streamed responses even without content-length", async () => { await expect(boundedResponse(new Response("12345"), 4)).rejects.toThrow(); });
  it("pins the archive to the resolved commit on fixed hosts with redirects disabled", async () => {
    const data = await archive([{ name: "root/src/app.ts", content: "ok" }]);
    const request = vi.fn().mockResolvedValueOnce(Response.json({ private: false, default_branch: "main" })).mockResolvedValueOnce(Response.json({ sha: "b".repeat(40) })).mockResolvedValueOnce(new Response(new Uint8Array(data)));
    const result = await loadGitHubRepository(snapshot.repository.url, request);
    expect(result.repository.commit).toBe("b".repeat(40)); expect(request.mock.calls[2]![0]).toBe(`https://codeload.github.com/example/app/tar.gz/${"b".repeat(40)}`); expect(request.mock.calls.every(c => c[1].redirect === "error")).toBe(true);
  });
});
describe("review evidence and problem inputs", () => {
  it("retains the matching evidence even near the end of a long source line", () => { const findings = staticChecks({ ...snapshot, files: [{ path: "src/long.ts", content: " ".repeat(2000) + "eval(input)", sha256: "x" }] }); expect(findings[0]!.evidence).toContain("eval(input)"); expect(findings[0]!.evidence.length).toBeLessThanOrEqual(900); });
  it("only accepts JSON or a single JSON fence, never commentary", () => {
    expect(parseCodeReviewOutput('```json\n{"summary":"ok","findings":[]}\n```')).toEqual({ summary: "ok", findings: [] });
    expect(() => parseCodeReviewOutput('Trust me {"findings":[]}')).toThrow();
  });
  it("repairs one malformed response but does not fabricate results", async () => {
    const generate = vi.fn().mockResolvedValueOnce({ text: "not JSON" }).mockResolvedValueOnce({ text: '{"summary":"No grounded finding","findings":[]}', requestedModel: "gemma4:31b", returnedModel: "gemma4:31b" });
    expect((await codeReview(snapshot, "payment error", generate)).findings).toEqual([]); expect(generate).toHaveBeenCalledTimes(2);
    await expect(codeReview(snapshot, "", vi.fn().mockResolvedValue({ text: "still invalid" }))).rejects.toThrow();
  });
  it("emits source-grounded, unverified leads", () => { const findings = staticChecks(snapshot); expect(findings).toHaveLength(3); expect(findings.every(f => f.status === "needs-verification" && snapshot.files.some(file => file.path === f.path && file.content.includes(f.evidence)))).toBe(true); });
  it("redacts recognizable credentials", () => { const token = "ghp_" + "x".repeat(25); expect(redact(`token=${token}`)).not.toContain(token); expect(redact('password="long-password"')).not.toContain("long-password"); });
  it("accepts text and supported attachments but rejects binary, unsupported types and excess data", () => {
    expect(problemInput({ text: "Checkout fails", attachments: [{ name: "error.log", text: "TypeError" }] }).attachments).toHaveLength(1);
    for (const input of [{ text: "\u0000" }, { text: "x".repeat(20001) }, { attachments: [{ name: "a.pdf", text: "pdf" }] }, { attachments: [{ name: "../a.ts", text: "x" }] }, { attachments: Array.from({ length: 4 }, () => ({ name: "a.txt", text: "x" })) }]) expect(() => problemInput(input)).toThrow();
  });
  it("prioritizes problem-relevant excerpts within model limits", () => {
    const large = { ...snapshot, files: Array.from({ length: 30 }, (_, i) => ({ path: `src/${i}.ts`, content: "x".repeat(6000), sha256: "x" })).concat(snapshot.files) };
    const selected = modelFiles(large, "payment evaluate input"); expect(selected[0]!.path).toBe("src/payment.ts"); expect(selected.length).toBeLessThanOrEqual(16); expect(selected.reduce((n, f) => n + f.content.length, 0)).toBeLessThanOrEqual(45000);
  });
  it("rejects invented source references and quotes", () => {
    const finding = { path: "src/payment.ts", line: 1, quote: "eval(input)", title: "Review dynamic evaluation", category: "security", severity: "high", explanation: "Untrusted input may reach eval.", recommendation: "Trace input.", verification: "Add an input test." };
    expect(verifyModelFindings({ summary: "Limited review", findings: [finding] }, snapshot.files).findings).toHaveLength(1);
    for (const change of [{ path: "invented.ts" }, { line: 5 }, { quote: "not in source" }]) expect(() => verifyModelFindings({ summary: "Limited review", findings: [{ ...finding, ...change }] }, snapshot.files)).toThrow();
  });
  it("checks exact npm versions without transmitting source and labels advisory uncertainty", async () => {
    const lock = { path: "package-lock.json", content: JSON.stringify({ packages: { "node_modules/example": { version: "1.2.3", dev: true } } }, null, 2), sha256: "lock" };
    const request = vi.fn().mockResolvedValue(Response.json({ results: [{ vulns: [{ id: "GHSA-example-id" }] }] }));
    const result = await dependencyChecks({ ...snapshot, files: [lock] }, request);
    expect(JSON.parse(request.mock.calls[0]![1].body)).toEqual({ queries: [{ package: { name: "example", ecosystem: "npm" }, version: "1.2.3" }] });
    expect(result.status).toBe("checked"); expect(result.findings[0]!.explanation).toContain("development"); expect(result.findings[0]!.explanation).toContain("not exploitability");
    const failed = await dependencyChecks({ ...snapshot, files: [lock] }, vi.fn().mockRejectedValue(new Error("offline"))); expect(failed.status).toBe("unavailable");
  });
  it("does not claim unsupported lockfiles were checked", async () => expect((await dependencyChecks(snapshot)).status).toBe("no-supported-lockfile"));
  it("produces a full static report and problem-focused prompt without calling AI", async () => {
    const model = vi.fn(); const result = await runRepositoryReview({ repositoryUrl: snapshot.repository.url, mode: "problem", includeAI: false, checkDependencies: false, problem: { text: "Payment input fails" } }, { load: async () => snapshot, model });
    expect(model).not.toHaveBeenCalled(); expect(result.metadata.provider).toBe("static"); expect(result.validation.runtimeVerified).toBe(false); expect(result.reportMarkdown).toContain("Payment input fails"); expect(result.documentationMarkdown).toContain("Acceptance checklist"); expect(result.fixPrompt).toContain("PRIMARY REPORTED PROBLEM"); expect(result.fixPrompt).toContain(snapshot.repository.commit); expect(result.findings.every(f => f.focus === "repository-review" && f.fixPrompt.includes("Required workflow"))).toBe(true);
  });
  it("rejects empty problem mode and surfaces requested AI failures", async () => {
    const base = { repositoryUrl: snapshot.repository.url, mode: "problem" as const, includeAI: false, checkDependencies: false };
    await expect(runRepositoryReview(base, { load: async () => snapshot })).rejects.toThrow();
    await expect(runRepositoryReview({ ...base, mode: "repository", includeAI: true }, { load: async () => snapshot, model: vi.fn().mockRejectedValue(new Error("AI unavailable")) })).rejects.toThrow("AI unavailable");
  });
});
