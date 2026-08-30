import { defineConfig, devices } from "@playwright/test";
import { join } from "node:path";

const requestedPort = process.env.VIDEO_OS_PLAYWRIGHT_PORT ?? "3000";
const playwrightPort = Number(requestedPort);
if (!Number.isInteger(playwrightPort) || playwrightPort < 1024 || playwrightPort > 65535) {
  throw new Error("VIDEO_OS_PLAYWRIGHT_PORT must be an integer between 1024 and 65535.");
}
const baseURL = `http://127.0.0.1:${playwrightPort}`;
const playwrightOutputDir =
  process.env.VIDEO_OS_PLAYWRIGHT_OUTPUT_DIR ??
  join(process.env.VIDEO_OS_DATA_ROOT ?? ".video-os-data", "playwright-results");

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: playwrightOutputDir,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${playwrightPort}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      PORT: String(playwrightPort),
      VIDEO_OS_ASSET_BASE_URL: baseURL,
      VIDEO_OS_AGENT_PROVIDER: "mock",
    },
  },
});
