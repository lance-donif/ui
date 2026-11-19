import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createAgent } from "@ui-sdk/react/agent";
import { afterEach, expect, test } from "vitest";
import { App } from "./App";

Object.assign(globalThis, { __UI_SDK_STRICT__: true });
Element.prototype.getAnimations = () => [];
afterEach(cleanup);

test("the selected resource exposes its link to keyboard and pointer users", async () => {
  const user = userEvent.setup();
  render(<App />);
  expect(screen.getByRole("link", { name: "阅读指南" }).getAttribute("href"))
    .toBe("https://ui-sdk.dev/docs/react#quick-start");

  await user.tab();
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
