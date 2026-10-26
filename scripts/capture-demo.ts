import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";
await mkdir("docs/screenshots", { recursive: true });
const browser = await chromium.launch();
const frames: Buffer[] = [];
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 820 }, deviceScaleFactor: 1 });
  await page.goto("http://127.0.0.1:3000"); await page.getByRole("heading", { name: /See the bug/ }).waitFor(); frames.push(await page.screenshot());
  await page.getByRole("link", { name: "Try the sample bug" }).click(); await page.getByRole("button", { name: "Generate issue draft" }).waitFor(); frames.push(await page.screenshot());
  await page.getByRole("button", { name: "Generate issue draft" }).click(); await page.waitForURL("**/result"); await page.getByText("Issue draft validated", { exact: true }).waitFor(); frames.push(await page.screenshot());
} finally { await browser.close(); }
const raw = await Promise.all(frames.map((frame) => sharp(frame).ensureAlpha().raw().toBuffer()));
await sharp(Buffer.concat(raw), { raw: { width: 1200, height: 820 * frames.length, channels: 4, pageHeight: 820 } }).gif({ loop: 0, delay: [1800, 2000, 3000] }).toFile("docs/demo.gif");
console.log("Captured a three-frame GIF of the actual synthetic-fixture web journey.");
