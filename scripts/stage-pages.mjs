import { copyFile, cp, readdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";

const publishedAssets = "site-assets";
const builtAssets = join("dist", publishedAssets);
const current = new Set(await readdir(builtAssets));

await cp(builtAssets, publishedAssets, { recursive: true });
await copyFile("dist/index.html", "index.html.next");
await rename("index.html.next", "index.html");

for (const name of await readdir(publishedAssets)) {
  if (!current.has(name)) {
    await rm(join(publishedAssets, name), { recursive: true });
  }
}
