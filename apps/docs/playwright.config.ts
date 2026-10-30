/**
 * Browser E2E for the docs site. Builds the production-shaped export (base path
 * /fluffboost) and serves out/ with scripts/serve-export.mjs, like GitHub Pages.
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173/",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "bun run build && bun run scripts/serve-export.mjs",
    url: "http://127.0.0.1:4173/",
    // Always rebuild, so the suite never runs against a stale export.
    reuseExistingServer: false,
    timeout: 180_000,
    // Built and served at the root, exactly like the custom domain.
    env: { NEXT_PUBLIC_BASE_PATH: "", PORT: "4173" },
  },
});
