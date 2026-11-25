import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end and accessibility checks against the LIVE portals.
 *
 * The portals are the part of the product nobody tests: they ship from their own
 * repository and (unlike the engine) do not auto-validate the API contract. These
 * tests talk to the deployed apps on purpose — a green local build proves nothing
 * about what customers load.
 *
 * Production is READ-ONLY: no session is created there. Every interactive flow
 * runs against the demo portal, where data is ephemeral by design.
 */
export default defineConfig({
  testDir: "./e2e",
  // Live portals over the public internet: occasionally slow, and a flaky gate
  // gets ignored. The retry is there for genuine network hiccups, not for bugs.
  timeout: 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: true,
  retries: 1,
  reporter: [["list"]],
  use: {
    ignoreHTTPSErrors: false,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "production",
      use: { ...devices["Desktop Chrome"], baseURL: "https://app.escal-ai.com" },
      testMatch: /production\.spec\.ts/,
    },
    {
      name: "demo",
      use: { ...devices["Desktop Chrome"], baseURL: "https://demo.escal-ai.com" },
      testMatch: /demo\.spec\.ts/,
    },
    {
      name: "a11y",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /accessibility\.spec\.ts/,
    },
  ],
});
