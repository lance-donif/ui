import { beforeEach, describe, expect, it, vi } from "vitest";
import { writeGameSave } from "./storage";

beforeEach(() => {
  window.localStorage.clear();
  vi.resetModules();
});

describe("arcade sound preferences", () => {
  it("inherits an old silent repair room once and remembers a later choice", async () => {
    writeGameSave("toy-repair", { sound: false }, true);
    const audio = await import("./audio");
    expect(audio.readAudioSettings().muted).toBe(true);
    audio.setAudioSettings({ muted: false, music: .31 });
    vi.resetModules();
    const reopened = await import("./audio");
    expect(reopened.readAudioSettings()).toMatchObject({ muted: false, music: .31 });
  });

  it("clamps levels, rejects non-finite input, and keeps equal snapshots stable", async () => {
    const audio = await import("./audio");
    const initial = audio.readAudioSettings();
    let updates = 0;
    const remove = audio.subscribeAudioSettings(() => updates++);
    audio.setAudioSettings({ music: NaN, effects: Infinity });
    expect(audio.readAudioSettings()).toBe(initial);
    audio.setAudioSettings({ music: -4, effects: 3 });
    const changed = audio.readAudioSettings();
    expect(changed).toEqual({ muted: false, music: 0, effects: 1 });
    audio.setAudioSettings({ effects: 1 });
    expect(audio.readAudioSettings()).toBe(changed);
    expect(updates).toBe(1);
    remove();
    audio.setAudioSettings({ muted: true });
    expect(updates).toBe(1);
  });

  it("keeps controls usable on devices without audio output", async () => {
    const audio = await import("./audio");
    const first = audio.connectAudio();
    const second = audio.connectAudio();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    audio.setAudioScene("pond");
    audio.playCue("hop");
    first();
    first();
    audio.setDiagnosticQuiet(true);
    audio.playCue("musicThree");
    audio.setAudioSettings({ music: .2 });
    expect(audio.readAudioSettings().music).toBe(.2);
    second();
  });
});
