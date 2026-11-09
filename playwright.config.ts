import { defineConfig, devices } from "@playwright/test";
import { randomBytes } from "node:crypto";
// Playwright's failure snapshots include password input values. Keep all
// credential-bearing DOM snapshots out of reports, including failed tests.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1";
// Generated once and inherited by test workers/owned servers. Never persisted.
for (const key of ["ADMIN", "SELLER", "APPLICANT"]) {
  process.env[`WEB_TEST_${key}_PHONE`] ??=
    `9${String(randomBytes(4).readUInt32BE()).padStart(9, "0").slice(-9)}`;
}
for (const role of ["ADMIN", "SELLER", "APPLICANT"])
  process.env[`WEB_TEST_${role}_PASSWORD`] ??=
    randomBytes(24).toString("base64url");
process.env.WEB_TEST_CONTROL_TOKEN ??= randomBytes(32).toString("hex");
export default defineConfig({
  testDir: "./tests/acceptance",
  fullyParallel: false,
  workers: 1,
  globalTeardown: "./tests/local/global-teardown.mjs",
  timeout: 90000,
  expect: { timeout: 20000 },
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/phase-2-results.json" }],
  ],
  use: {
    baseURL: "http://localhost:3200",
    headless: true,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "desktop-firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "android-chromium-emulation", use: { ...devices["Pixel 7"] } },
    { name: "iphone-webkit-emulation", use: { ...devices["iPhone 13"] } },
  ],
  webServer: [
    {
      command: "node tests/local/server.mjs",
      url: "http://127.0.0.1:4501/health",
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: "node tests/local/next-server.mjs",
      url: "http://127.0.0.1:3200/login",
      reuseExistingServer: false,
      timeout: 180000,
      env: {
        NEXT_PUBLIC_API_URL: "http://localhost:4500/api/v1",
        NEXT_TELEMETRY_DISABLED: "1",
        ZIPPCART_WEB_TEST: "true",
      },
    },
  ],
});
