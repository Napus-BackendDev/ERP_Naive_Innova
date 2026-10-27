import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT || 3100);
const baseURL = `http://localhost:${PORT}`;
const BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT || 5100);
const backendURL = `http://localhost:${BACKEND_PORT}`;
const evidenceMode = process.env.E2E_EVIDENCE === "1";
const reporters = [["list"]];
if (evidenceMode) reporters.push(["./e2e/evidence-reporter.mjs"]);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: reporters,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    headless: true,
    trace: "retain-on-failure",
    screenshot: evidenceMode ? "on" : "only-on-failure",
    // Uses the Chrome already installed on the machine, so no browser download
    // is needed. Override with PLAYWRIGHT_CHANNEL=msedge (or install chromium).
    channel: process.env.PLAYWRIGHT_CHANNEL || "chrome"
  },
  projects: [
    {
      name: "ui-mock",
      testMatch: ["admin-modules.spec.js", "tracking.spec.js"],
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "fullstack",
      testMatch: ["fullstack/**/*.spec.js"],
      // Real API + in-memory MongoDB + cold Next.js compilation needs more room
      // than the mocked UI smoke tests.
      timeout: 120_000,
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: [
    {
      command: `npm run dev -- --port ${PORT}`,
      url: `${baseURL}/track`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        NEXT_TELEMETRY_DISABLED: "1",
        NEXT_PUBLIC_API_URL: `${backendURL}/api`,
        NEXT_PUBLIC_ENABLE_MOCK_LOGIN: "true",
        NEXT_PUBLIC_BACKEND_URL: backendURL
      }
    },
    {
      command: `node ../backend/scripts/e2e-server.js`,
      url: `${backendURL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        E2E_BACKEND_PORT: String(BACKEND_PORT),
        E2E_CLIENT_URL: baseURL,
        E2E_BACKEND_URL: backendURL
      }
    }
  ]
});
