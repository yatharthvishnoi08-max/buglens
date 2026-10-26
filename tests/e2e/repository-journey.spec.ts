import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { runRepositoryReview } from "../../src/lib/review/run";

test("repository-first problem input to report, documentation and fix prompt", async ({ page }, info) => {
  const result = await runRepositoryReview({ repositoryUrl: "https://github.com/example/app", mode: "problem", includeAI: false, checkDependencies: false, problem: { text: "Checkout actions are clipped on mobile", attachments: [{ name: "error.log", text: "Checkout button is outside the visible container" }] } }, { load: async () => ({ repository: { owner: "example", name: "app", url: "https://github.com/example/app", commit: "a".repeat(40), branch: "main" }, files: [{ path: "src/checkout.css", content: ".checkout { min-width: 600px; overflow: hidden; }", sha256: "test-source" }], totalFiles: 1, eligibleFiles: 1, skippedFiles: 0, sensitivePaths: [], truncated: false, bytes: 48 }) });
  let sent = "";
  await page.route("**/api/review-repository", async route => { sent = route.request().postData() ?? ""; await route.fulfill({ contentType: "application/x-ndjson", body: JSON.stringify({ type: "stage", message: "Inspecting test source" }) + "\n" + JSON.stringify({ type: "result", result }) + "\n" }); });
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Start with your GitHub repository." })).toBeVisible();
  await page.getByLabel("Public GitHub repository URL").fill("https://github.com/example/app");
  await page.getByRole("radio", { name: /Investigate a reported problem/ }).check();
  await page.getByLabel("Paste a description, error, stack trace, logs or code").fill("Checkout actions are clipped on mobile");
  await page.getByLabel("Attach supporting text files").setInputFiles({ name: "error.log", mimeType: "text/plain", buffer: Buffer.from("Checkout button is outside the visible container") });
  await expect(page.getByRole("button", { name: "Remove error.log" })).toBeVisible();
  await page.getByRole("checkbox", { name: /Gemma 4 source review/ }).uncheck();
  await page.getByRole("checkbox", { name: /Known dependency vulnerabilities/ }).uncheck();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: `docs/screenshots/${info.project.name}-repository-input.png`, fullPage: true });
  await page.getByRole("button", { name: "Investigate problem" }).click();
  await expect(page).toHaveURL(/\/result$/);
  expect(sent).toContain("Checkout actions are clipped on mobile"); expect(sent).toContain("error.log");
  await expect(page.getByRole("heading", { name: "From findings to a fix plan." })).toBeFocused();
  await expect(page.getByRole("heading", { name: "What was actually checked" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Large fixed width may overflow narrow screens" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: `docs/screenshots/${info.project.name}-repository-result.png` });
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text: string) => { (window as Window & { copiedPrompt?: string }).copiedPrompt = text; } } }));
  const firstFinding = page.locator(".finding-card").first();
  await firstFinding.getByText("Exact fix prompt for this finding", { exact: true }).click();
  await expect(firstFinding.locator(".artifact-panel pre")).toContainText("fix only the listed finding");
  await firstFinding.getByRole("button", { name: "Copy", exact: true }).click();
  expect(await page.evaluate(() => (window as Window & { copiedPrompt?: string }).copiedPrompt)).toBe(result.findings[0]!.fixPrompt);
  for (const [view, filename, content] of [["Full report", "buglens-report.md", "Checkout actions are clipped on mobile"], ["Documentation", "buglens-remediation.md", "Acceptance checklist"], ["Fix prompt", "buglens-fix-prompt.txt", "PRIMARY REPORTED PROBLEM"]]) {
    await page.getByRole("button", { name: view, exact: true }).click();
    await expect(page.locator(".artifact-panel pre")).toContainText(content!);
    const downloaded = page.waitForEvent("download"); await page.getByRole("button", { name: "Download", exact: true }).click(); const download = await downloaded;
    const downloadedText = await readFile((await download.path())!, "utf8");
    expect(download.suggestedFilename()).toBe(filename); expect(downloadedText).toContain(content!);
    if (view === "Fix prompt") {
      expect(downloadedText).toBe(result.fixPrompt);
      expect(downloadedText).not.toContain("BugLens did not execute");
      expect(downloadedText).not.toContain("not a shell command");
      await expect(page.locator(".artifact-panel pre")).toContainText("Acceptance criteria:");
      await page.getByRole("button", { name: "Copy", exact: true }).click();
      expect(await page.evaluate(() => (window as Window & { copiedPrompt?: string }).copiedPrompt)).toBe(result.fixPrompt);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  expect(errors).toEqual([]); expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  await page.reload(); await expect(page.getByRole("heading", { name: "Start with your repository." })).toBeVisible();
});
