import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
const skipped = new Set(["node_modules", ".git", ".vercel", ".next", "dist", "coverage", "work", "test-results", "playwright-report"]);
export async function sourceFiles(root = process.cwd()): Promise<string[]> {
  const files: string[] = [];
  async function walk(dir: string) {
    for (const entry of (await readdir(path.join(root, dir), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isSymbolicLink() || skipped.has(entry.name) || (entry.name.startsWith(".env") && entry.name !== ".env.example") || /(?:\.zip|\.tsbuildinfo|\.DS_Store)$/.test(entry.name)) continue;
      const relative = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(relative); else files.push(relative);
    }
  }
  await walk(""); return files;
}
export async function assertNoKey(files: string[]) {
  let key = process.env.GEMINI_API_KEY ?? "";
  if (!key) { try { key = (await readFile(".env.local", "utf8")).match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim() ?? ""; } catch { /* A fresh checkout has no key. */ } }
  for (const file of files) {
    const data = await readFile(file);
    if (key && data.includes(Buffer.from(key))) throw new Error(`Credential content detected in ${file}; packaging stopped.`);
    if (/\.env(?:\.|$)/.test(path.basename(file)) && path.basename(file) !== ".env.example") throw new Error("Environment file is not allowed in source archive.");
  }
}
