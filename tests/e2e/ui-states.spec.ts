import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { runRepositoryReview } from "../../src/lib/review/run";

test("UI routes, responsive layouts, recoverable failure and partial results", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Viewport matrix runs once; existing journeys cover mobile separately.");
  test.setTimeout(120000);
  await mkdir("docs/assets/ui", { recursive: true });
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [path, name, heading] of [["/", "landing", "Check your GitHub code"], ["/demo", "workspace", "Start with your GitHub repository."], ["/how-it-works", "guide", "Know what your review means."], ["/result", "empty", "Start with your repository."], ["/page-does-not-exist", "not-found", "This page is out of view."]]) {
      await page.goto(path!);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(heading!);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name} at ${width}`).toBe(true);
      await page.screenshot({ path: `docs/assets/ui/${name}-${width}.png`, fullPage: true });
    }
  }
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/demo");
  await page.getByRole("button", { name: "Analyze repository", exact: true }).click();
  expect(await page.getByLabel("Public GitHub repository URL").evaluate((n: HTMLInputElement) => n.validity.valueMissing)).toBe(true);
  await page.getByLabel("Public GitHub repository URL").fill("https://github.com/example/app");
  await page.getByLabel("Paste a description, error, stack trace, logs or code").fill("Keep this input after a recoverable failure.");
  await page.getByRole("checkbox", { name: /Gemma 4 source review/ }).uncheck();
  await page.getByRole("checkbox", { name: /Known dependency vulnerabilities/ }).uncheck();
  let release!: () => void;
  const gate = new Promise<void>(r => { release = r; });
  await page.route("**/api/review-repository", async route => { await gate; await route.fulfill({ contentType: "application/x-ndjson", body: JSON.stringify({ type: "stage", message: "Loading the repository snapshot" }) + "\n" + JSON.stringify({ type: "error", error: { code: "REPOSITORY_UNAVAILABLE", message: "The service is temporarily unavailable. Retry later." } }) + "\n" }); });
  await page.getByRole("button", { name: "Analyze repository", exact: true }).click();
  await expect(page.getByRole("button", { name: /Reviewing your repository/ })).toBeDisabled();
  await expect(page.getByLabel("Public GitHub repository URL")).toBeDisabled();
  await page.screenshot({ path: "docs/assets/ui/loading-375.png", fullPage: true });
  release();
  await expect(page.locator("#review-error")).toContainText("temporarily unavailable");
  await expect(page.getByLabel("Paste a description, error, stack trace, logs or code")).toHaveValue("Keep this input after a recoverable failure.");
  await expect(page.getByRole("button", { name: "Analyze repository", exact: true })).toBeEnabled();
  await page.screenshot({ path: "docs/assets/ui/error-375.png", fullPage: true });
  await page.unroute("**/api/review-repository");
  const result = await runRepositoryReview({ repositoryUrl: "https://github.com/example/app", mode: "repository", includeAI: false, checkDependencies: true }, { load: async () => ({ repository: { url: "https://github.com/example/app", owner: "example", name: "app", branch: "main", commit: "a".repeat(40) }, files: [{ path: `src/${"long-component-".repeat(8)}.tsx`, content: "const value = eval(input);", sha256: "fixture" }], totalFiles: 8, eligibleFiles: 6, skippedFiles: 7, sensitivePaths: [], bytes: 26, truncated: true }), dependencies: async () => ({ findings: [], packages: 0, status: "unavailable", warnings: ["Advisory service unavailable in this controlled UI test."] }) });
  await page.route("**/api/review-repository", route => route.fulfill({ contentType: "application/x-ndjson", body: JSON.stringify({ type: "result", result }) + "\n" }));
  await page.getByRole("button", { name: "Analyze repository", exact: true }).click();
  await expect(page.getByRole("heading", { name: "From findings to a fix plan." })).toBeVisible();
  await expect(page.getByText("Review report ready", { exact: true })).toBeVisible();
  await expect(page.getByText("Some checks are incomplete", { exact: true })).toHaveCount(0);
  await expect(page.locator(".review-result .feedback-warning")).toHaveCount(0);
  const coverageNotes = page.locator("#review-coverage-notes");
  await expect(coverageNotes.locator("summary")).toContainText("Partial");
  await expect(coverageNotes).not.toHaveAttribute("open", "");
  await expect(coverageNotes.locator("p")).toBeHidden();
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `docs/assets/ui/partial-result-${width}.png`, fullPage: true });
    await coverageNotes.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(coverageNotes.locator("p")).toContainText("Some files were skipped");
    await expect(coverageNotes.locator("p")).toContainText("service was unavailable");
    await expect(coverageNotes.locator("p")).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(coverageNotes.locator("p")).toBeHidden();
    await page.getByRole("button", { name: "Fix prompt", exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `docs/assets/ui/prompt-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Findings", exact: true }).click();
  }
  await page.getByRole("button", { name: "Full report", exact: true }).click();
  await expect(page.locator(".artifact-panel pre")).toContainText("Truncated by limits: yes");
  await expect(page.locator(".artifact-panel pre")).toContainText("Advisory service unavailable in this controlled UI test.");
  await page.getByRole("button", { name: "Findings", exact: true }).click();
  await page.getByLabel("Filter by area").selectOption("testing");
  await expect(page.getByRole("heading", { name: "No findings in this selection." })).toBeVisible();
  await page.screenshot({ path: "docs/assets/ui/empty-findings-1440.png", fullPage: true });
  expect(errors).toEqual([]);
});
