import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createAgent } from "@ui-sdk/react/agent";
import { afterEach, expect, test } from "vitest";
import { App } from "./App";
import { writeGameSave } from "./shared/storage";

Object.assign(globalThis, { __UI_SDK_STRICT__: true });
Element.prototype.getAnimations = () => [];
afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState(null, "", "#/");
});

test("the hall links each card to a distinct game and shows resumable progress per game", () => {
  render(<App />);
  expect(screen.getByRole("link", { name: /拼布工坊.*开始游戏/ }).getAttribute("href")).toBe("#/quilt");
  expect(screen.getByRole("link", { name: /玩具修理所.*开始游戏/ }).getAttribute("href")).toBe("#/toy-repair");
  expect(screen.getByRole("link", { name: /池塘跳跳.*开始游戏/ }).getAttribute("href")).toBe("#/pond");
  act(() => writeGameSave("pond", { steps: 3 }, true));
  expect(screen.getByRole("link", { name: /池塘跳跳.*继续游玩/ }).getAttribute("href")).toBe("#/pond");
  expect(screen.getAllByRole("link", { name: /继续游玩/ })).toHaveLength(1);
  act(() => writeGameSave("pond", { best: 4 }, false));
  expect(screen.queryByRole("link", { name: /继续游玩/ })).toBeNull();
});

test.each([
  ["quilt", /开始拼风筝/],
  ["toy-repair", /接单并进入维修室/],
  ["pond", /开始挑战/],
] as const)("a direct link to %s loads the playable first action", async (id, action) => {
  window.history.replaceState(null, "", "#/" + id);
  render(<App />);
  expect(await screen.findByRole("button", { name: action }, { timeout: 5000 })).toBeDefined();
  expect(screen.getByRole("link", { name: /游戏大厅/ }).getAttribute("href")).toBe("#/");
});

test("the selected resource exposes its link to keyboard and pointer users", async () => {
  const user = userEvent.setup();
  window.history.replaceState(null, "", "#/resources");
  render(<App />);
  expect(screen.getByRole("link", { name: "阅读指南" }).getAttribute("href"))
    .toBe("https://ui-sdk.dev/docs/react#quick-start");

  screen.getByRole("tab", { name: "入门" }).focus();
  expect(document.activeElement).toBe(screen.getByRole("tab", { name: "入门" }));
  await user.keyboard("{ArrowRight}");
  expect(screen.getByRole("tab", { name: "组件", selected: true })).toBe(document.activeElement);
  expect(screen.getByRole("link", { name: "浏览组件" }).getAttribute("href"))
    .toBe("https://ui-sdk.dev/docs/react/components");

  await user.click(screen.getByRole("tab", { name: "源码" }));
  expect(screen.getByRole("link", { name: "打开 GitHub" }).getAttribute("href"))
    .toBe("https://github.com/lance-donif/ui");
  expect(screen.queryByRole("link", { name: "浏览组件" })).toBeNull();
});

test("an agent can discover and select a resource", async () => {
  const agent = createAgent();
  window.history.replaceState(null, "", "#/resources");
  render(<App />);
  const tabs = agent.snapshot().find(entry => entry.component === "tabs" && !entry.offPage);
  expect(tabs?.label).toBe("项目资源");
  const item = tabs?.items?.find(item => item.label.includes("组件"));
  expect(item).toBeDefined();

  await act(async () => {
    const result = await agent.act({
      steps: [{ ref: "项目资源", action: "setValue", args: [item!.value] }],
    });
    expect(result.ok, result.error?.message).toBe(true);
  });
  expect(screen.getByRole("link", { name: "浏览组件" })).toBeDefined();
});
