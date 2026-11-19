import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as audio from "../../shared/audio";
import {
  hasGameProgress,
  readGameSave,
  writeGameSave,
} from "../../shared/storage";
import Game from "./index";
import { freshSave, newJob, type StudioSave } from "./model";
import { angleDelta } from "./Workbench";

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const click = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole("button", { name }));
describe("维修室正常入口", () => {
  it("用点按完成小熊，刷新恢复针脚，交还后只有手册记录", () => {
    const cues = vi.spyOn(audio, "playCue");
    const game = render(<Game />);
    click(/接单并进入维修室/);
    expect(screen.queryByRole("navigation", { name: "修理所" })).toBeNull();
    click("使用点按或键盘操作");
    const drop = () => {
      click("握住起点");
      click("对准并松手");
    };
    drop();
    click("镊子");
    drop();
    click("针线");
    drop();
    drop();
    expect(readGameSave<StudioSave>("toy-repair")?.active.bear?.repeat).toBe(2);
    click("↶ 退回一针");
    game.unmount();
    render(<Game />);
    expect(screen.getByRole("heading", { name: "穿过对侧针孔" })).toBeTruthy();
    click("使用点按或键盘操作");
    click("针线");
    for (let i = 0; i < 4; i++) drop();
    click("镊子");
    drop();
    click("剪刀");
    drop();
    click("手套");
    drop();
    click(/交还玩具/);
    const sounds = cues.mock.calls
      .map(([cue]) => cue)
      .filter((cue) => cue !== "tool");
    expect(sounds).toEqual([
      "bearPull",
      "grab",
      "stitch",
      "stitch",
      "undo",
      "stitch",
      "stitch",
      "stitch",
      "stitch",
      "slide",
      "snip",
      "bearPull",
      "badge",
    ]);
    expect(screen.getByText("右臂开线")).toBeTruthy();
    expect(hasGameProgress("toy-repair")).toBe(false);
    click("← 全部记录");
    expect(screen.getByRole("button", { name: /小熊玩偶/ })).toBeTruthy();
  });
  it("静音也可核验证据，试修只亮出实际完成的两音", (context) => {
    const previous = audio.readAudioSettings();
    context.onTestFinished(() => {
      audio.setAudioSettings(previous);
    });
    audio.setAudioSettings({ muted: true });
    const music = {
      ...newJob("music", 1, "keep", 9),
      phase: "trial" as const,
      weak: 1,
    };
    writeGameSave(
      "toy-repair",
      { ...freshSave(), active: { music }, last: "music" },
      true,
    );
    render(<Game />);
    click("发条钥匙");
    click("使用点按或键盘操作");
    click("↺ 逆转 90°");
    expect(screen.getByRole("status").textContent).toContain("方向相反");
    for (let i = 0; i < 4; i++) click("↻ 顺转 90°");
    expect(
      screen.getByLabelText("2 个音符亮起").querySelectorAll(".played"),
    ).toHaveLength(2);
    click(/回到故障部位/);
    expect(screen.getByRole("heading", { name: "调准梳齿间隙" })).toBeTruthy();
  });
  it("完成测试后保存红标终点，工作台可以回柜台挑另一单", () => {
    const music = newJob("music", 1, "keep", 12);
    writeGameSave(
      "toy-repair",
      { ...freshSave(), active: { music }, last: "music" },
      true,
    );
    render(<Game />);
    click(/轻转钥匙/);
    click("发条钥匙");
    click("使用点按或键盘操作");
    click("↻ 顺转 90°");
    expect(
      document.querySelector<HTMLElement>(".tr-gauge i")?.style.transform,
    ).toBe("rotate(90deg)");
    expect(screen.getByRole("status").textContent).toContain("转到三点");
    click(/回到柜台/);
    click(/木制风车/);
    click(/接单并进入维修室/);
    expect(Object.keys(readGameSave<StudioSave>("toy-repair")!.active)).toEqual(
      ["music", "wind"],
    );
  });
  it("全部局数据损坏时清除大厅继续状态", () => {
    writeGameSave(
      "toy-repair",
      { active: { car: null }, history: null, last: "toString" },
      true,
    );
    render(<Game />);
    expect(hasGameProgress("toy-repair")).toBe(false);
    expect(
      screen.getByRole("button", { name: /接单并进入维修室/ }),
    ).toBeTruthy();
  });
  it("跨越角度边界不会把顺转计成整圈逆转", () => {
    expect(angleDelta(-178, 179)).toBe(3);
    expect(angleDelta(178, -179)).toBe(-3);
  });
});

describe("材料声与音乐盒听诊", () => {
  it.each([
    { step: 0, tool: "螺丝刀", cue: "screw" },
    { step: 2, tool: "镊子", cue: "gear" },
  ])("小车工序 $step 单次落稳只发出 $cue", ({ step, tool, cue }) => {
    const sounds = vi.spyOn(audio, "playCue");
    const car = {
      ...newJob("car", 0, "keep", 41),
      phase: "repair" as const,
      step,
    };
    writeGameSave(
      "toy-repair",
      { ...freshSave(), active: { car }, last: "car" },
      true,
    );
    render(<Game />);
    click(tool);
    click("使用点按或键盘操作");
    sounds.mockClear();
    if (step === 0) {
      click("↻ 顺转 90°");
      expect(sounds).not.toHaveBeenCalled();
      click("↺ 逆转 90°");
    } else {
      click("握住起点");
      expect(sounds).not.toHaveBeenCalled();
      click("对准并松手");
    }
    expect(sounds.mock.calls).toEqual([[cue]]);
  });
  it.each([
    {
      fault: 0 as const,
      test: "轻转钥匙",
      tool: "发条钥匙",
      expected: [],
      red: "rotate(0deg)",
    },
    {
      fault: 0 as const,
      test: "手转滚筒",
      tool: "手套",
      expected: [["musicTwo"]],
      red: "rotate(90deg)",
    },
    {
      fault: 1 as const,
      test: "轻转钥匙",
      tool: "发条钥匙",
      expected: [],
      red: "rotate(90deg)",
    },
    {
      fault: 1 as const,
      test: "手转滚筒",
      tool: "手套",
      expected: [],
      red: "rotate(90deg)",
    },
  ])(
    "故障 $fault 用 $test 时只播放实测线索",
    ({ fault, test, tool, expected, red }) => {
      const sounds = vi.spyOn(audio, "playCue");
      const quiet = vi.spyOn(audio, "setDiagnosticQuiet");
      const music = newJob("music", fault, "keep", 47);
      writeGameSave(
        "toy-repair",
        { ...freshSave(), active: { music }, last: "music" },
        true,
      );
      render(<Game />);
      expect(quiet).toHaveBeenLastCalledWith(true);
      click(new RegExp(test));
      click(tool);
      click("使用点按或键盘操作");
      click("↻ 顺转 90°");
      expect(sounds.mock.calls).toEqual(expected);
      expect(
        document.querySelector<HTMLElement>(".tr-gauge i")?.style.transform,
      ).toBe(red);
      click(/打开证据/);
      expect(quiet).toHaveBeenLastCalledWith(false);
    },
  );
  it.each([
    { fault: 0 as const, weak: 1, expected: [], lamps: 0 },
    { fault: 1 as const, weak: 1, expected: [["musicTwo"]], lamps: 2 },
    { fault: 1 as const, weak: null, expected: [["musicThree"]], lamps: 3 },
  ])(
    "试修故障 $fault / 偏差 $weak 时发出 $lamps 个音",
    ({ fault, weak, expected, lamps }) => {
      const sounds = vi.spyOn(audio, "playCue");
      const quiet = vi.spyOn(audio, "setDiagnosticQuiet");
      const music = {
        ...newJob("music", fault, "keep", 54),
        weak,
        phase: "trial" as const,
      };
      writeGameSave(
        "toy-repair",
        { ...freshSave(), active: { music }, last: "music" },
        true,
      );
      const game = render(<Game />);
      click("发条钥匙");
      click("使用点按或键盘操作");
      for (let i = 0; i < 3; i++) click("↻ 顺转 90°");
      expect(sounds).not.toHaveBeenCalled();
      click("↻ 顺转 90°");
      expect(sounds.mock.calls).toEqual(expected);
      expect(
        screen
          .getByLabelText(lamps + " 个音符亮起")
          .querySelectorAll(".played"),
      ).toHaveLength(lamps);
      expect(quiet).toHaveBeenLastCalledWith(true);
      game.unmount();
      expect(quiet).toHaveBeenLastCalledWith(false);
    },
  );
});
