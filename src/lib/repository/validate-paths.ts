import path from "node:path";
import { lstat, realpath, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { BugLensError } from "../errors";
import type { RepositoryMatch } from "../schema/evidence";
export const ignoredDirectories = new Set(["node_modules", "dist", "build", "out", "coverage", "vendor", "public"]);
export function allowedPath(relative: string) {
  const parts = relative.split("/");
  const file = parts.at(-1) ?? "";
  return parts.every((p) => p && !p.startsWith(".") && !ignoredDirectories.has(p)) && !/(secret|credential|token|private|\.config\.|lock\.)/i.test(file) && (file === "package.json" || /\.(?:[cm]?[jt]sx?|css|scss|html|vue|svelte|md)$/.test(file));
}
export async function repositoryRoot(root: string) {
  try { const real = await realpath(root); if (!(await lstat(real)).isDirectory()) throw new Error(); return real; }
  catch { throw new BugLensError("REPOSITORY_UNAVAILABLE", "The authorized repository directory is not readable."); }
}
export async function safeFile(root: string, relative: string) {
  if (path.isAbsolute(relative) || relative.includes("\\") || relative.includes("\0") || relative.split("/").includes("..") || !allowedPath(relative)) throw new BugLensError("UNVERIFIED_FILE_REFERENCE", "A repository reference is outside the allowed source files.");
  const base = await repositoryRoot(root);
  const candidate = path.resolve(base, relative);
  try {
    const stat = await lstat(candidate);
    const real = await realpath(candidate);
    if (stat.isSymbolicLink() || !stat.isFile() || stat.size > 256_000 || !real.startsWith(base + path.sep)) throw new Error();
    return real;
  } catch { throw new BugLensError("UNVERIFIED_FILE_REFERENCE", `Repository file could not be verified: ${relative}`); }
}
export const fileHash = (content: string) => createHash("sha256").update(content).digest("hex");
export function declaredSymbol(line: string) { return line.match(/^\s*(?:export\s+(?:default\s+)?)?(?:async\s+)?(?:function|class|const|let|interface|type)\s+([A-Za-z_$][\w$]*)/)?.[1]; }
export async function validatePaths(root: string, matches: RepositoryMatch[]) {
  for (const match of matches) {
    if (match.verified !== true) throw new BugLensError("UNVERIFIED_FILE_REFERENCE", "Unverified files cannot be compiled.");
    const content = await readFile(await safeFile(root, match.path), "utf8");
    const line = content.split(/\r?\n/)[match.line - 1];
    if (fileHash(content) !== match.sha256 || line === undefined || line.slice(0, 600) !== match.excerpt || (match.symbol && declaredSymbol(line) !== match.symbol)) throw new BugLensError("UNVERIFIED_FILE_REFERENCE", "Repository evidence changed or its symbol was not verified. Scan again.");
  }
}
