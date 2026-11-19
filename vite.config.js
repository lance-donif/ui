import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  base: "./",
  build: {
    outDir: "../dist",
    assetsDir: "site-assets",
    license: { fileName: "site-assets/licenses.md" },
    emptyOutDir: true,
  },
});
