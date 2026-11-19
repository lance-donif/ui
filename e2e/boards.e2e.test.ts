import { expect, test } from "@playwright/test";
import { box, button, captureDesign, enterGame, press, touchSession } from "./play.test-utils";

test("拼布从三步风筝到亲手装上数织布标", async ({ page }, info) => {
  await enterGame(page, "quilt", info);
  const start = button(page, /开始拼风筝|开始拼图/).first();
  await expect(start).toBeVisible();
  if (info.project.name === "mobile") {
    await captureDesign(page, info, "quilt-home", {
      art: page.locator(".qw-feature-image img:visible").first(), action: start, dock: page.locator(".qw-tabs"),
    });
  }
  await press(start, info);
  const tile = (n: number) => button(page, new RegExp(`^布块 ${n}，`));
  const frame = page.locator(".qw-play .qw-frame");
  await captureDesign(page, info, "quilt-board", { board: frame, title: page.locator(".qw-play .qw-section-title") });
  await press(tile(3), info);
  await expect(button(page, /撤回一步/)).toBeDisabled();
  await press(tile(4), info);
  await page.reload();
  await expect(tile(4)).toHaveAccessibleName(/第 2 行第 1 列/);
  await press(button(page, /撤回一步/), info);
  for (const n of [4, 5, 8]) await press(tile(n), info);
  await expect(page.getByRole("heading", { name: "拼好了！" })).toBeVisible();
  await captureDesign(page, info, "quilt-finish", {
    art: page.locator(".qw-result figure img"), score: page.locator(".qw-result .qw-stats"),
  });
  await press(button(page, /查看作品/), info);
  await captureDesign(page, info, "quilt-work", { art: page.locator(".qw-zoom img") });
  await press(button(page, /制作布标/), info);
  const rows = [[1, 3, 5], [1, 2, 3, 4, 5], [2, 3, 4], [3], [3]];
  for (const row of [1, 0, 2, 3, 4]) {
    for (const col of rows[row]) await press(button(page, new RegExp(`^第${row+1}行第${col}列`)), info);
    if (row === 1) await captureDesign(page, info, "quilt-loom", {
      board: page.locator(".qw-crossword"), needle: button(page, "缝线"), undo: button(page, /撤回一针/),
    });
  }
  await press(button(page, "装上布标"), info);
  await expect(page.getByRole("img", { name: "郁金香布标" })).toBeVisible();
});

test("蓝湾帆影的四阶棋盘能查看原图再继续移动", async ({ page }, info) => {
  await enterGame(page, "quilt", info);
  await press(button(page, /蓝湾帆影/).first(), info);
  await press(button(page, /经典拼图/), info);
  const board = page.locator('.qw-play[data-size="4"]');
  const frame = board.locator(".qw-frame");
  await expect(frame.getByRole("button")).toHaveCount(15);
  await captureDesign(page, info, "quilt-sail", { board: frame, title: board.locator(".qw-section-title") });
  const original = button(page, "按住看原图");
  const overlay = frame.getByRole("img", { name: /完整图样/ });
  if (info.project.use.hasTouch) {
    const spot = await box(original);
    const session = await touchSession(page);
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [
      { x: spot.x + spot.width / 2, y: spot.y + spot.height / 2 },
    ] });
    await expect(overlay).toBeVisible();
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else {
    await original.hover();
    await page.mouse.down();
    await expect(overlay).toBeVisible();
    await page.mouse.up();
  }
  await expect(overlay).toBeHidden();
  await press(button(page, /^布块 11，/), info);
  await expect(board.locator(".qw-metric")).toContainText("1 步");
  await press(button(page, /^布块 12，/), info);
  await expect(page.getByRole("heading", { name: "拼好了！" })).toBeVisible();
});

test("断叶水闸先直达，再撤回并带花到旗", async ({ page }, info) => {
  await enterGame(page, "pond", info);
  await press(button(page, /风过荷塘/), info);
  await press(button(page, /进入断叶水闸/), info);
  const hop = async (...pads: string[]) => {
    for (const pad of pads) await press(button(page, new RegExp(`^${pad} `)), info);
  };
  await hop("A3", "B3", "B2", "B1", "C1");
  await expect(page.getByText("最佳 5 步 · 本局未摘莲花")).toBeVisible();
  await press(button(page, "再玩一次"), info);
  await hop("A3", "B3", "C3");
  await expect(page.getByRole("img", { name: "随身莲花" })).toBeVisible();
  await page.reload();
  await press(button(page, "暂停游戏"), info);
  await press(button(page, "撤回一步"), info);
  await expect(button(page, "C3 莲花")).toBeVisible();
  await hop("C3", "B3", "B2", "B1", "C1");
  await expect(page.getByRole("heading", { name: "抵达小旗！" })).toBeVisible();
  await expect(page.getByText("最佳 5 步 · 本局获得花章")).toBeVisible();
});
