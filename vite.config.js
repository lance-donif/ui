import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  root: "src",
  base: "./",
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "game",
          environment: "jsdom",
          exclude: [...configDefaults.exclude, "App.test.tsx"],
        },
      },
      {
        extends: true,
        test: { name: "app", environment: "happy-dom", include: ["App.test.tsx"] },
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
