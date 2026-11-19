import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { box, button, press } from "./play.test-utils";

async function inspectNavigation(page: Page, info: TestInfo, width: number) {
  await page.setViewportSize({ width, height: info.project.name === "mobile" ? 844 : 940 });
  await page.goto("./");
  const mast = page.locator(".arcade-mast");
  const sound = button(page, "声音设置");
  const origin = await box(mast);
  const soundBox = await box(sound);
  const checkHeader = async () => {
    const header = await box(mast);
    const speaker = await box(sound);
    expect(Math.abs(header.y - origin.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(header.height - origin.height)).toBeLessThanOrEqual(1);
    expect(Math.abs(speaker.x - soundBox.x)).toBeLessThanOrEqual(1);
    expect(speaker.width).toBe(soundBox.width);
    expect(speaker.height).toBe(soundBox.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  };
  const routes = {
    quilt: ["四季布展", "作品册", "图样册"],
    "toy-repair": width <= 740 ? ["维修室", "维修手册", "委托柜台"] : ["维修手册", "委托柜台"],
    pond: ["我的", "收藏", "池塘"],
  };
  for (const [id, tabs] of Object.entries(routes)) {
    await press(page.locator(`[data-game="${id}"]`), info);
    await expect(page.getByRole("link", { name: "返回游戏大厅" })).toBeVisible();
    await checkHeader();
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
    await checkHeader();
    const dock = page.locator(".arcade-dock");
    const original = await box(dock);
    for (const name of tabs) {
      const tab = dock.getByRole("button", { name, exact: true });
      const before = await box(tab);
      await press(tab, info);
      await expect(tab).toHaveAttribute("aria-current", "page");
      const after = await box(tab);
      expect(Math.abs(original.y - (await box(dock)).y)).toBeLessThanOrEqual(1);
      expect(Math.abs(before.x - after.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(before.width - after.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(before.height - after.height)).toBeLessThanOrEqual(1);
    }
    await press(page.getByRole("link", { name: "返回游戏大厅" }), info);
    await expect(page.locator(".lobby-cards")).toBeVisible();
    await checkHeader();
  }
}

test("跨页、滚动与切换短长列表时导航保持原位", async ({ page }, info) => {
  await inspectNavigation(page, info, info.project.name === "mobile" ? 390 : 1360);
});

test("320px 窄屏导航保持原位", async ({ page }, info) => {
  await inspectNavigation(page, info, 320);
});
