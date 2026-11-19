import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { box, button, captureDesign, drag, enterGame, gesture, press } from "./play.test-utils";

const seamHoles = [[293, 207], [330, 251], [309, 296], [344, 344], [317, 391], [352, 436]] as const;

async function center(control: Locator) {
  const rect = await box(control);
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

async function selectTool(page: Page, tool: string, info: TestInfo) {
  const control = button(page, tool);
  if (await control.getAttribute("aria-pressed") !== "true") await press(control, info);
  await expect(control).toHaveAttribute("aria-pressed", "true");
}

async function useTool(page: Page, tool: string, info: TestInfo) {
  const board = page.locator(".tr-board");
  await selectTool(page, tool, info);
  await board.scrollIntoViewIfNeeded();
  await drag(page, await center(board.locator(".tr-origin")), await center(board.locator(".tr-target")), info);
}

test("在小熊实际右臂上进出五针，失手和撤回后仍能缝合交还", async ({ page }, info) => {
  await enterGame(page, "toy-repair", info);
  const accept = button(page, /接单并进入维修室/);
  await captureDesign(page, info, "toy-counter", {
    art: page.locator(".tr-counter-stage"), action: accept, dock: page.locator(".tr-tabs"),
  });
  await press(accept, info);
  await useTool(page, "手套", info);
  await useTool(page, "镊子", info);
  await selectTool(page, "针线", info);
  const board = page.locator(".tr-board");
  const canvas = board.locator("canvas").first();
  await expect(canvas).toBeVisible();
  await canvas.screenshot({ path: info.outputPath("bear-open.png") });

  const sew = async (index: number, miss = false) => {
    await board.scrollIntoViewIfNeeded();
    const rect = await box(canvas);
    const onArt = ([x, y]: readonly [number, number]) => ({
      x: rect.x + x * rect.width / 622, y: rect.y + y * rect.height / 622,
    });
    const start = onArt(seamHoles[index]);
    const end = onArt(seamHoles[index + 1]);
    if (miss) end.x += rect.width * 0.18;
    await drag(page, start, end, info);
  };

  await sew(0, true);
  await expect(page.getByRole("status")).toContainText(/错|对准/);
  await sew(0);
  await sew(1);
  await page.reload();
  await expect(page.getByRole("heading", { name: /穿过对侧针孔/ })).toBeVisible();
  await press(button(page, /退回一针/), info);
  await selectTool(page, "针线", info);
  for (const i of [1, 2]) await sew(i);
  await expect(canvas).toHaveAccessibleName(/已缝 3 针/);
  await captureDesign(page, info, "toy-stitch", { board, tools: page.locator(".tr-toolbelt") });
  for (const i of [3, 4]) await sew(i);
  await expect(page.locator(".tr-taskcard h2")).toContainText(/收紧|收线/);
  await canvas.screenshot({ path: info.outputPath("bear-closed.png") });
  await useTool(page, "镊子", info);
  await useTool(page, "剪刀", info);
  await useTool(page, "手套", info);
  await expect(page.getByRole("heading", { name: "试修通过" })).toBeVisible();
  await press(button(page, /交还玩具/), info);
  await expect(page.locator(".tr-record-detail")).toContainText("右臂开线");
  await press(button(page, /全部记录/), info);
  await expect(button(page, /小熊玩偶/)).toBeVisible();
});

test("小车拆盖、夹齿轮、装回与上弦试跑", async ({ page }, info) => {
  await enterGame(page, "toy-repair", info);
  if (info.project.use.hasTouch) await press(button(page, "切换委托"), info);
  await press(button(page, /发条小车/), info);
  await press(button(page, /接单并进入维修室/), info);
  const board = page.locator(".tr-board");
  const rotate = async (tool: string, degrees: number) => {
    await selectTool(page, tool, info);
    await board.scrollIntoViewIfNeeded();
    const pivot = await center(board.locator(".tr-turn-ring"));
    const handle = await center(board.locator(".tr-origin"));
    const area = await box(board);
    const radius = (handle.x - pivot.x) / area.width;
    const samples = Math.ceil(Math.abs(degrees) / 30);
    const arc = Array.from({ length: samples + 1 }, (_, i) => {
      const angle = degrees * i / samples * Math.PI / 180;
      return { x: pivot.x + Math.cos(angle) * radius * area.width, y: pivot.y + Math.sin(angle) * radius * area.height };
    });
    await gesture(page, arc, info);
  };
  await rotate("发条钥匙", 90);
  for (let i = 0; i < 4; i++) await rotate("螺丝刀", -90);
  await useTool(page, "手套", info);
  const gearTitle = page.getByRole("heading", { name: /齿轮落座/ });
  await expect(gearTitle).toBeVisible();
  await press(button(page, "镊子"), info);
  await board.scrollIntoViewIfNeeded();
  const slot = await center(board.locator(".tr-target"));
  const rect = await box(board);
  await drag(page, await center(board.locator(".tr-origin")), { x: slot.x + rect.width * .17, y: slot.y }, info);
  await expect(gearTitle).toBeVisible();
  await useTool(page, "镊子", info);
  await rotate("手套", 90);
  await useTool(page, "手套", info);
  for (let i = 0; i < 4; i++) await rotate("螺丝刀", 90);
  await rotate("发条钥匙", 360);
  await expect(page.getByRole("heading", { name: "试修通过" })).toBeVisible();
  if (info.project.use.hasTouch) await expect(page.locator(".tr-delivery-art")).toHaveCSS("opacity", "1");
  await captureDesign(page, info, "toy-delivery", {
    art: page.locator(".tr-delivery-art img"), action: button(page, /交还玩具/), dock: page.locator(".tr-tabs"),
  });
  await press(button(page, /交还玩具/), info);
  await expect(page.locator(".tr-record-detail")).toContainText("齿轮脱位");
});

test("用辅助操作交还小车和小熊，刷新后能从手册分别翻回两笔记录", async ({ page }, info) => {
  await enterGame(page, "toy-repair", info);
  const activate = (name: string | RegExp) => button(page, name).press("Enter");
  const take = async (tool: string) => {
    const control = button(page, tool);
    if (await control.getAttribute("aria-pressed") !== "true") await control.press("Enter");
  };
  const place = async (tool: string, times = 1) => {
    await take(tool);
    for (let i = 0; i < times; i++) {
      await activate("握住起点");
      await activate("对准并松手");
    }
  };
  const turn = async (tool: string, direction: "顺转" | "逆转", times: number) => {
    await take(tool);
    for (let i = 0; i < times; i++) await activate(new RegExp(direction + " 90°"));
  };
  const pick = async (toy: string) => {
    if (info.project.use.hasTouch) await activate("切换委托");
    await activate(new RegExp(toy));
    await activate(/接单并进入维修室/);
    const assist = button(page, "使用点按或键盘操作");
    if (await assist.isVisible()) await assist.press("Enter");
  };
  await pick("发条小车");
  await turn("发条钥匙", "顺转", 1);
  await turn("螺丝刀", "逆转", 4);
  await place("手套");
  await place("镊子");
  await turn("手套", "顺转", 1);
  await place("手套");
  await turn("螺丝刀", "顺转", 4);
  await turn("发条钥匙", "顺转", 4);
  await activate(/交还玩具/);
  await activate("委托柜台");
  await pick("小熊玩偶");
  await place("手套");
  await place("镊子");
  await place("针线", 5);
  await place("镊子");
  await place("剪刀");
  await place("手套");
  await activate(/交还玩具/);
  await page.reload();
  await activate("维修手册");
  const records = page.locator(".tr-records");
  await expect(records.getByRole("button")).toHaveCount(2);
  await captureDesign(page, info, "toy-book", { records, dock: page.locator(".tr-tabs") });
  for (const [toy, symptom] of [["小熊玩偶", "右臂开线"], ["发条小车", "齿轮脱位"]]) {
    await activate(new RegExp(toy));
    await expect(page.locator(".tr-record-detail")).toContainText(symptom);
    await activate(/全部记录/);
  }
});
