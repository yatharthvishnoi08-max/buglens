import { build } from "esbuild";
import { mkdir, readFile, writeFile, cp, mkdtemp, copyFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { sourceFiles, assertNoKey } from "./source-files";

const root = process.cwd();
await mkdir("public", { recursive: true }); await mkdir("work", { recursive: true });
await import("./export-schemas");
for (const name of ["analyze-visual", "scan-repository", "validate-evidence", "compile-issue", "review-repository"]) await build({ entryPoints: [`skills/buglens/scripts/${name}.ts`], outfile: `skills/buglens/scripts/${name}.mjs`, bundle: true, platform: "node", format: "esm", target: "node20", packages: "external", logLevel: "warning" });
await cp("fixtures", "skills/buglens/fixtures", { recursive: true });
await copyFile("LICENSE", "skills/buglens/LICENSE");
const pkg = JSON.parse(await readFile("package.json", "utf8"));
await writeFile("skills/buglens/package.json", JSON.stringify({ name: "buglens-agent-skill", version: pkg.version, private: true, type: "module", license: "Apache-2.0", engines: { node: ">=20.18.0" }, dependencies: Object.fromEntries(["zod", "sharp", "tar-stream"].map((name) => [name, pkg.dependencies[name]])) }, null, 2) + "\n");
const staging = await mkdtemp(path.join(root, "work", "package-"));
const files = await sourceFiles(); await assertNoKey(files);
for (const file of files) { const dest = path.join(staging, "buglens-source", file); await mkdir(path.dirname(dest), { recursive: true }); await copyFile(file, dest); }
await cp("skills/buglens", path.join(staging, "buglens"), { recursive: true, filter: (source) => !source.split(path.sep).includes("node_modules") });
for (const [folder, name] of [["buglens-source", "buglens-source.zip"], ["buglens", "buglens-skill.zip"]]) {
  const archive = path.join(staging, name!);
  execFileSync("zip", ["-q", "-r", archive, folder!], { cwd: staging });
  const contents = execFileSync("unzip", ["-Z1", archive], { encoding: "utf8" });
  if (contents.split("\n").some((entry) => /(?:^|\/)\.env(?:\.|$)/.test(entry) && !entry.endsWith("/.env.example"))) throw new Error("Unsafe archive content");
  await copyFile(archive, path.join(root, "public", name!));
}
console.log("Built standalone skill scripts, self-contained skill archive and source archive. Private environment files were excluded.");
