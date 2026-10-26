import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, cp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { scanRepository } from "../../src/lib/repository/scan";
import { safeFile, validatePaths } from "../../src/lib/repository/validate-paths";
import { fixtureRoot } from "../../src/lib/gemma/fixture-provider";
const temporary: string[] = [];
async function clone() { const dir = await mkdtemp(path.join(tmpdir(), "buglens-test-")); temporary.push(dir); await cp(fixtureRoot(), dir, { recursive: true }); return dir; }
afterEach(async () => { await Promise.all(temporary.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))); });
describe("deterministic repository grounding", () => {
  it("finds the checkout files and verifies their declarations", async () => {
    const report = await scanRepository(fixtureRoot(), "checkout Continue action overflow");
    expect(report.matches.map((m) => m.path)).toEqual(expect.arrayContaining(["src/components/CheckoutActions.tsx", "src/styles/checkout.css", "tests/checkout.test.ts"]));
    expect(report.matches[0]!.path).not.toContain("Account");
    expect(report.matches.every((m) => m.verified && m.relationship === "hypothesis")).toBe(true);
    await expect(validatePaths(fixtureRoot(), report.matches)).resolves.toBeUndefined();
  });
  it("Node fallback produces the same ranked paths as rg", async () => {
    const a = await scanRepository(fixtureRoot(), "checkout Continue"); const b = await scanRepository(fixtureRoot(), "checkout Continue", { forceNode: true });
    expect(b.method).toBe("node"); expect(b.matches.map((m) => m.path)).toEqual(a.matches.map((m) => m.path));
  });
  it.each(["../.env.local", "/etc/passwd", "..\\secret.ts", "src/../../secret.ts", "src/absent.tsx", ".env", "secret.ts"])("rejects unsafe or absent path %s", async (file) => {
    await expect(safeFile(fixtureRoot(), file)).rejects.toMatchObject({ code: "UNVERIFIED_FILE_REFERENCE" });
  });
  it("rejects symlinks, ignores secrets, and detects source mutation", async () => {
    const root = await clone(); await symlink("/etc/passwd", path.join(root, "src/escape.ts"));
    await writeFile(path.join(root, "secret.ts"), "checkout secret");
    const report = await scanRepository(root, "checkout secret", { forceNode: true });
    expect(report.matches.some((m) => /secret|escape/.test(m.path))).toBe(false);
    const target = report.matches[0]!; await writeFile(path.join(root, target.path), "changed");
    await expect(validatePaths(root, report.matches)).rejects.toMatchObject({ code: "UNVERIFIED_FILE_REFERENCE" });
  });
  it("does not return a deleted relevant file", async () => {
    const root = await clone(); await rm(path.join(root, "src/styles/checkout.css"));
    expect((await scanRepository(root, "checkout overflow")).matches.some((m) => m.path.endsWith("checkout.css"))).toBe(false);
  });
});
