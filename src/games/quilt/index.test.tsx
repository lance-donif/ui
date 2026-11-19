import { emptySave, STITCH, makeRound, move, type Save } from "./rules";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import {
  hasGameProgress,
  readGameSave,
  writeGameSave,
} from "../../shared/storage";
import Quilt from "./index";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function button(name: string | RegExp) {
  return screen.getByRole("button", { name });
}
function tile(number: number) {
  return button(new RegExp(`^布块 ${number}，`));
}

it("三步拼好风筝并从作品册进入计时重玩", async () => {
  const user = userEvent.setup();
  render(<Quilt />);
  await user.click(button("作品册"));
  expect(screen.queryByRole("button", { name: /计时挑战/ })).toBeNull();
  await user.click(button(/去拼第一幅/));

  expect(button(/撤回一步/).hasAttribute("disabled")).toBe(true);
  expect(screen.queryByLabelText("本局用时")).toBeNull();
  const preview = button(/按住看原图/);
  await user.pointer({ target: preview, keys: "[MouseLeft>]" });
  expect(screen.getByRole("img", { name: "风起时完整图样" })).toBeDefined();
  await user.pointer({ keys: "[/MouseLeft]" });
  expect(screen.queryByRole("img", { name: "风起时完整图样" })).toBeNull();

  for (const number of [4, 5, 8]) await user.click(tile(number));
  expect(screen.getByRole("heading", { name: "拼好了！" })).toBeDefined();
  await user.click(button(/查看作品/));
  await user.click(button(/← 作品册/));
  await user.click(button(/风起时/));
  expect(screen.getByText("3 步")).toBeDefined();
  await user.click(button(/计时挑战/));
  expect(screen.getByLabelText("本局用时").textContent).toBe("00:00.00");
  for (const number of [4, 5, 8]) await user.click(tile(number));
  expect(screen.getByRole("heading", { name: "达成目标" })).toBeDefined();
  await user.click(button(/重玩同一局/));
  expect(tile(4).getAttribute("aria-label")).toContain("第 2 行第 2 列");
  expect(screen.getByLabelText("本局用时").textContent).toBe("00:00.00");
});

it("退出并重新加载后继续原局，撤回可回到已保存的上一步", async () => {
  const user = userEvent.setup();
  const firstVisit = render(<Quilt />);
  await user.click(button(/开始拼风筝/));
  await user.click(tile(3));
  expect(screen.getByRole("status").textContent).toMatch(/相邻/);
  expect(button(/撤回一步/).hasAttribute("disabled")).toBe(true);
  await user.click(tile(4));
  expect(tile(4).getAttribute("aria-label")).toContain("第 2 行第 1 列");
  await user.click(button(/收起绷框/));
  expect(hasGameProgress("quilt")).toBe(true);
  firstVisit.unmount();

  render(<Quilt />);
  expect(tile(4).getAttribute("aria-label")).toContain("第 2 行第 1 列");
  await user.click(button(/撤回一步/));
  expect(tile(4).getAttribute("aria-label")).toContain("第 2 行第 2 列");
  expect(button(/撤回一步/).hasAttribute("disabled")).toBe(true);
});

it("从完成的风筝绣布标，中途离开可继续，收针后可取下和重新装饰", async () => {
  const user = userEvent.setup();
  render(<Quilt />);
  await user.click(button(/开始拼风筝/));
  for (const number of [4, 5, 8]) await user.click(tile(number));
  await user.click(button(/查看作品/));
  expect(hasGameProgress("quilt")).toBe(false);
  await user.click(button(/制作布标/));
  await user.click(button("第1行第1列，未标"));
  await user.click(button("标空"));
  await user.click(button("第1行第2列，未标"));
  await user.click(button(/回到作品/));
  await user.click(button(/继续绣布标/));
  expect(button("第1行第1列，缝线").getAttribute("aria-pressed")).toBe("true");
  expect(button("第1行第2列，标空")).toBeDefined();
  await user.click(button("撤回一针"));
  expect(button("第1行第2列，未标")).toBeDefined();

  const remainingStitches = [
    [1, 3],
    [1, 5],
    [2, 1],
    [2, 2],
    [2, 3],
    [2, 4],
    [2, 5],
    [3, 2],
    [3, 3],
    [3, 4],
    [4, 3],
    [5, 3],
  ];
  for (const [row, col] of remainingStitches) {
    await user.click(button(`第${row}行第${col}列，未标`));
  }
  expect(screen.getByRole("heading", { name: "绣好了！" })).toBeDefined();
  await user.click(button("装上布标"));
  expect(screen.getByRole("img", { name: "郁金香布标" })).toBeDefined();
  await user.click(button("取下郁金香布标"));
  expect(screen.queryByRole("img", { name: "郁金香布标" })).toBeNull();
  await user.click(button("装上郁金香布标"));
  expect(screen.getByRole("img", { name: "郁金香布标" })).toBeDefined();
});

it("布标可以稍后装饰，刷新后仍保留已完成且未佩戴的奖励", async () => {
  const user = userEvent.setup();
  const save = emptySave();
  save.records.kite = { classic: 3 };
  save.loom.cells = STITCH.slice();
  save.loom.cells[22] = 0;
  save.loom.history = [Array(25).fill(0)];
  writeGameSave("quilt", save, true);
  const first = render(<Quilt />);
  await user.click(button("第5行第3列，未标"));
  expect(screen.getByRole("heading", { name: "绣好了！" })).toBeDefined();
  expect(readGameSave<Save>("quilt")?.loom.attached).toBe(false);
  await user.click(button("稍后"));
  expect(screen.getByRole("button", { name: "装上郁金香布标" })).toBeDefined();
  first.unmount();
  render(<Quilt />);
  await user.click(button("作品册"));
  await user.click(button(/风起时/));
  await user.click(button("装上郁金香布标"));
  expect(readGameSave<Save>("quilt")?.loom.attached).toBe(true);
  expect(hasGameProgress("quilt")).toBe(false);
});

it("棋盘与绣框交替时，重新进入直接落在最近一次操作的任务", async () => {
  const user = userEvent.setup();
  const save = emptySave();
  save.records.kite = { classic: 3 };
  const partial = move(makeRound("kite", "classic"), 4);
  save.rounds["kite/classic"] = partial;
  save.recent = ["kite/classic"];
  writeGameSave("quilt", save, true);

  let mount = render(<Quilt />);
  expect(tile(4).getAttribute("aria-label")).toContain("第 2 行第 1 列");
  await user.click(button(/收起绷框/));
  await user.click(button("← 图样册"));
  await user.click(button("作品册"));
  await user.click(button(/风起时/));
  await user.click(button(/制作布标/));
  await user.click(button("第1行第1列，未标"));
  mount.unmount();

  mount = render(<Quilt />);
  expect(button("第1行第1列，缝线")).toBeDefined();
  await user.click(button(/回到作品/));
  await user.click(button("自由重玩"));
  mount.unmount();

  render(<Quilt />);
  expect(tile(4).getAttribute("aria-label")).toContain("第 2 行第 1 列");
  expect(readGameSave<Save>("quilt")?.loom.cells[0]).toBe(1);
});

it("挂载时校正损坏进度的大厅续玩标记，保留收藏和布标历史", () => {
  const data = emptySave();
  data.records.kite = { classic: 3 };
  data.loom = {
    cells: STITCH.slice(),
    history: [Array(25).fill(0)],
    finished: true,
    attached: true,
  };
  const broken = makeRound("kite", "thread");
  broken.frame.board = [0, 0];
  data.rounds["kite/thread"] = broken;
  data.recent = ["kite/thread"];
  writeGameSave("quilt", data, true);

  const visit = render(<Quilt />);
  expect(screen.getByRole("heading", { name: "挑一幅图样" })).toBeDefined();
  visit.unmount();
  expect(hasGameProgress("quilt")).toBe(false);
  const repaired = readGameSave<Save>("quilt");
  expect(repaired?.rounds).toEqual({});
  expect(repaired?.records).toEqual(data.records);
  expect(repaired?.loom).toEqual(data.loom);
});
