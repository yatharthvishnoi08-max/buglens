import { sourceFiles, assertNoKey } from "./source-files";
import { access } from "node:fs/promises";
import path from "node:path";
const files = await sourceFiles(); await assertNoKey(files);
try {
  await access(".next/static");
  const clientFiles = await sourceFiles(path.resolve(".next/static"));
  await assertNoKey(clientFiles.map((file) => path.join(".next/static", file)));
  console.log(`Checked ${clientFiles.length} production client assets for the configured API key.`);
} catch (error) {
  if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) throw error;
}
console.log(`Checked ${files.length} distributable files: no configured API key or private environment file present.`);
