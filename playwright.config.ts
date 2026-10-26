import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e", timeout: 60000, fullyParallel: false, workers: 1,
  use: { baseURL: process.env.BUGLENS_BASE_URL ?? "http://127.0.0.1:3000", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }, { name: "mobile", use: { viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } }],
  webServer: process.env.BUGLENS_BASE_URL ? undefined : { command: "npm run start -- --port 3000", url: "http://127.0.0.1:3000", reuseExistingServer: !process.env.CI, timeout: 120000, env: { DEMO_MODE: "fixture", NEXT_TELEMETRY_DISABLED: "1" } },
});
