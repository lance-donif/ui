import { defineConfig } from "@playwright/test";

const publicSite = process.env.PLAYTEST_URL;
const preview = "http://127.0.0.1:4773/ui/";
const previewFiles = "../node_modules/.cache/arcade-playtest";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results",
  workers: 2,
  forbidOnly: !!process.env.CI,
  use: {
    baseURL: publicSite ?? preview,
    browserName: "chromium",
    locale: "zh-CN",
    screenshot: "only-on-failure",
    trace: { mode: "retain-on-failure", screenshots: false, snapshots: true, sources: true },
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1360, height: 940 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } },
  ],
  webServer: publicSite ? undefined : {
    command: `bun x vite build --outDir ${previewFiles} && bun run preview --outDir ${previewFiles} --base /ui/ --host 127.0.0.1 --port 4773 --strictPort`,
    url: preview,
  },
});
