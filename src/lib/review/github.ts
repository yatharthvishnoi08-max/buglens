import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { extract } from "tar-stream";
import { BugLensError } from "../errors";
import type { Snapshot, SourceFile } from "./schema";

const MAX_ARCHIVE = 20 * 1024 * 1024;
const MAX_EXPANDED = 64 * 1024 * 1024;
const MAX_SOURCE = 8 * 1024 * 1024;
const MAX_FILES = 1000;
export function parseGitHubUrl(value: string) {
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new BugLensError("REPOSITORY_UNAVAILABLE", "Enter a public GitHub repository URL, for example https://github.com/owner/repo."); }
  const match = url.pathname.match(/^\/([A-Za-z0-9][A-Za-z0-9-]{0,38})\/([A-Za-z0-9_.-]{1,100})\/?$/);
  if (url.protocol !== "https:" || url.hostname !== "github.com" || url.port || url.username || url.password || url.search || url.hash || !match || [".", ".."].includes(match[2]!)) throw new BugLensError("REPOSITORY_UNAVAILABLE", "Use an HTTPS github.com/owner/repository URL without a branch, query, or credentials. Only public GitHub repositories are supported.");
  const owner = match[1]!, name = match[2]!.replace(/\.git$/, "");
  if (!name || [".", ".."].includes(name)) throw new BugLensError("REPOSITORY_UNAVAILABLE", "Invalid GitHub repository name.");
  return { owner, name, url: `https://github.com/${owner}/${name}` };
}
export function safeReviewPath(name: string) {
  return name.length <= 300 && !name.startsWith("/") && !name.includes("\\") && !/[\x00-\x1f\x7f]/.test(name) && name.split("/").every(p => p && p !== "." && p !== "..");
}
const ignored = new Set(["node_modules", "vendor", ".git", ".next", "dist", "build", "coverage", ".venv", "venv", "__pycache__", ".cache"]);
export function sensitivePath(name: string) { return /(?:^|\/)(?:\.env(?:\.(?!example$|sample$|template$)[^/]+)?|credentials[^/]*|id_rsa|id_ed25519)$|\.(?:pem|key|p12|pfx)$/i.test(name); }
export function eligiblePath(name: string) {
  return safeReviewPath(name) && !name.split("/").some(p => ignored.has(p)) && !sensitivePath(name) && !/(?:\.min\.(?:js|css)|\.map|\.d\.ts)$/.test(name) && /\.(?:[cm]?[jt]sx?|css|scss|html?|vue|svelte|py|go|rs|java|rb|php|sql|ya?ml|json|sh)$|(?:^|\/)(?:Dockerfile|requirements\.txt|Cargo\.toml|go\.mod)$/i.test(name);
}
export async function boundedResponse(response: Response, max: number): Promise<Buffer> {
  if (Number(response.headers.get("content-length")) > max) throw new BugLensError("REPOSITORY_UNAVAILABLE", "Repository response exceeds this demo's safe size limit.");
  const reader = response.body?.getReader(); if (!reader) throw new BugLensError("REPOSITORY_UNAVAILABLE", "Repository response was empty.");
  let bytes = 0; const chunks: Uint8Array[] = [];
  while (true) { const { done, value } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > max) { await reader.cancel(); throw new BugLensError("REPOSITORY_UNAVAILABLE", "Repository is too large for this demo. Use a smaller repository or the local skill."); } chunks.push(value); }
  return Buffer.concat(chunks);
}
export async function parseArchive(archive: Buffer): Promise<Omit<Snapshot, "repository">> {
  if (archive.length > MAX_ARCHIVE) throw new BugLensError("REPOSITORY_UNAVAILABLE", "The repository exceeds the 20 MB compressed archive limit.");
  let expanded: Buffer;
  try { expanded = gunzipSync(archive, { maxOutputLength: MAX_EXPANDED }); } catch { throw new BugLensError("REPOSITORY_UNAVAILABLE", "The repository archive is invalid or exceeds the 64 MB expanded limit."); }
  const files: SourceFile[] = [], sensitivePaths: string[] = [];
  let totalFiles = 0, eligibleFiles = 0, skippedFiles = 0, bytes = 0, truncated = false;
  const names = new Set<string>();
  await new Promise<void>((resolve, reject) => {
    const parser = extract();
    parser.on("entry", (header, stream, next) => {
      const raw = header.name.replace(/\/$/, "");
      const slash = raw.indexOf("/");
      const name = slash < 0 ? "" : raw.slice(slash + 1);
      if (header.type !== "directory") totalFiles++;
      const limit = /(?:^|\/)package-lock\.json$/.test(name) ? 2_000_000 : 256_000;
      if (name && sensitivePath(name) && safeReviewPath(name)) sensitivePaths.push(name);
      const eligible = name && safeReviewPath(raw) && header.type === "file" && eligiblePath(name);
      if (eligible) eligibleFiles++;
      const keep = eligible && !names.has(name) && (header.size ?? 0) <= limit && files.length < MAX_FILES && bytes + (header.size ?? 0) <= MAX_SOURCE;
      if (!keep) { if (header.type !== "directory") skippedFiles++; if (eligible) truncated = true; stream.resume(); stream.on("end", next); return; }
      names.add(name); const chunks: Buffer[] = [];
      stream.on("data", chunk => { if (Buffer.isBuffer(chunk)) chunks.push(chunk); else reject(new Error("Invalid archive stream")); });
      stream.on("end", () => {
        const data = Buffer.concat(chunks); bytes += data.length;
        if (data.includes(0)) { skippedFiles++; } else files.push({ path: name, content: data.toString("utf8"), sha256: createHash("sha256").update(data).digest("hex") });
        next();
      });
      stream.on("error", reject);
    });
    parser.on("error", reject); parser.on("finish", resolve); parser.end(expanded);
  }).catch(() => { throw new BugLensError("REPOSITORY_UNAVAILABLE", "The repository archive could not be safely inspected."); });
  return { files: files.sort((a, b) => a.path.localeCompare(b.path)), totalFiles, eligibleFiles, skippedFiles, sensitivePaths: [...new Set(sensitivePaths)].slice(0, 50), bytes, truncated };
}
export async function loadGitHubRepository(value: string, request: typeof fetch = fetch): Promise<Snapshot> {
  const repo = parseGitHubUrl(value);
  async function json(url: string) {
    const response = await request(url, { headers: { Accept: "application/vnd.github+json", "User-Agent": "BugLens-repository-review" }, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new BugLensError("REPOSITORY_UNAVAILABLE", response.status === 403 || response.status === 429 ? "GitHub's anonymous API limit was reached. Retry later; no sample repository was substituted." : "This public GitHub repository could not be read. Private repositories and moved URLs are not supported.");
    return JSON.parse((await boundedResponse(response, 1_000_000)).toString("utf8"));
  }
  try {
    const metadata = await json(`https://api.github.com/repos/${repo.owner}/${repo.name}`);
    if (metadata.private || typeof metadata.default_branch !== "string" || metadata.default_branch.length > 200) throw new BugLensError("REPOSITORY_UNAVAILABLE", "Only public repositories with a default branch are supported.");
    const commit = await json(`https://api.github.com/repos/${repo.owner}/${repo.name}/commits/${encodeURIComponent(metadata.default_branch)}`);
    if (typeof commit.sha !== "string" || !/^[a-f0-9]{40}$/.test(commit.sha)) throw new BugLensError("REPOSITORY_UNAVAILABLE", "A fixed repository commit could not be established.");
    const response = await request(`https://codeload.github.com/${repo.owner}/${repo.name}/tar.gz/${commit.sha}`, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(25_000) });
    if (!response.ok) throw new BugLensError("REPOSITORY_UNAVAILABLE", "The repository snapshot could not be downloaded.");
    return { repository: { ...repo, branch: metadata.default_branch, commit: commit.sha }, ...await parseArchive(await boundedResponse(response, MAX_ARCHIVE)) };
  } catch (error) { if (error instanceof BugLensError) throw error; throw new BugLensError("REPOSITORY_UNAVAILABLE", "GitHub could not be reached or the repository response was invalid. Retry later."); }
}
