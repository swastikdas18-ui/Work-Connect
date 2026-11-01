import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.yaml.spec.ts",
  timeout: 60000,
  use: {
    baseURL: process.env.TEST_BASE_URL || "https://work-connect-silk.vercel.app",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

