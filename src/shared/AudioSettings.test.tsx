import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { AudioSettingsButton } from "./AudioSettings";
import { readAudioSettings, setAudioSettings } from "./audio";

const initial = readAudioSettings();
afterEach(() => {
  cleanup();
  setAudioSettings(initial);
});

test("volume channels stay independent and retain their levels when muted", async () => {
  setAudioSettings({ music: 0.25, effects: 0.8, muted: false });
  const user = userEvent.setup();
  render(<AudioSettingsButton />);
  const trigger = screen.getByRole("button", { name: "声音设置" });
  await user.click(trigger);
  const dialog = within(await screen.findByRole("dialog", { name: "声音设置" }));
  fireEvent.change(dialog.getByRole("slider", { name: "背景音乐" }), { target: { value: "62" } });
  expect(readAudioSettings()).toMatchObject({ music: 0.62, effects: 0.8 });
  await user.click(dialog.getByRole("switch", { name: "全部静音" }));
  expect(readAudioSettings()).toMatchObject({ music: 0.62, effects: 0.8, muted: true });
  expect(dialog.getByRole("button", { name: "试听音效" }).hasAttribute("disabled")).toBe(true);

  act(() => setAudioSettings({ effects: 0.35, muted: false }));
  expect(dialog.getByRole("slider", { name: "游戏音效" }).getAttribute("aria-valuetext")).toBe("35%");
  expect(dialog.getByRole("button", { name: "试听音效" }).hasAttribute("disabled")).toBe(false);
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(trigger);
});
