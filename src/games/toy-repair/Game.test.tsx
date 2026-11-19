import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  hasGameProgress,
  readGameSave,
  writeGameSave,
} from "../../shared/storage";
import Game from "./index";
import { freshSave, newJob, type StudioSave } from "./model";
import { angleDelta } from "./Workbench";

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);
const click = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole("button", { name }));
describe("维修室正常入口", () => {
  it("用点按完成小熊，刷新恢复针脚，交还后只有手册记录", () => {
    const game = render(<Game />);
    click("声音开");
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
    expect(screen.getByText("右臂开线")).toBeTruthy();
    expect(hasGameProgress("toy-repair")).toBe(false);
    click("← 全部记录");
    expect(screen.getByRole("button", { name: /小熊玩偶/ })).toBeTruthy();
  });
  it("静音也可核验证据，试修只亮出实际完成的两音", () => {
    const music = {
      ...newJob("music", 1, "keep", 9),
      phase: "trial" as const,
      weak: 1,
    };
    writeGameSave(
      "toy-repair",
      { ...freshSave(), sound: false, active: { music }, last: "music" },
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
      { ...freshSave(), sound: false, active: { music }, last: "music" },
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
