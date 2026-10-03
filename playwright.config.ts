import { defineConfig } from "@playwright/test";

// Phone, tablet and desktop widths the platform must work at.
const WIDTHS = [375, 390, 412, 768, 1280];

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    // Use a preinstalled Chromium when given (CI images, sandboxes); otherwise Playwright's own.
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: WIDTHS.map((width) => ({ name: `w${width}`, use: { viewport: { width, height: 860 } } })),
  webServer: { command: "npm run build && npx next start -p 3100", url: "http://localhost:3100", reuseExistingServer: true, timeout: 180_000 },
});
