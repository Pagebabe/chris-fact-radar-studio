import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3217",
    trace: "on-first-retry",
  },
  webServer: {
    // Playwright starts a fresh production server for stable handoff gates.
    // The build step is included here so tests still work after .next was cleaned.
    command: "npm run build && npm run start",
    url: "http://localhost:3217",
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      OPENAI_API_KEY: "",
      OPENAI_BASE_URL: "",
      ANTHROPIC_API_KEY: "",
      YOUTUBE_API_KEY: "",
      SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
