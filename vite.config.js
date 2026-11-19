import { configDefaults, defineConfig } from "vitest/config";

const animationTests = ["App.test.tsx", "shared/AudioSettings.test.tsx"];

export default defineConfig({
  root: "src",
  base: "./",
  test: {
    maxWorkers: 2,
    projects: [
      {
        extends: true,
        test: {
          name: "game",
          environment: "jsdom",
          exclude: [...configDefaults.exclude, ...animationTests],
        },
      },
      {
        extends: true,
        test: { name: "app", environment: "happy-dom", include: animationTests },
      },
    ],
  },
  build: {
    outDir: "../dist",
    assetsDir: "site-assets",
    license: { fileName: "site-assets/licenses.md" },
    emptyOutDir: true,
  },
});
