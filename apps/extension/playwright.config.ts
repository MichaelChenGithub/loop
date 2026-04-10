import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.smoke.spec.ts",
  fullyParallel: false,
  reporter: "list",
  use: {
    viewport: {
      width: 1440,
      height: 900
    }
  }
});
