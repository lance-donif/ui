import { afterEach, expect, test } from "vitest";
import { hasGameProgress, readGameSave, storageUnavailable, writeGameSave } from "./storage";

afterEach(() => {
  localStorage.clear();
});

test("isolates games and ignores an unreadable save", () => {
  writeGameSave("quilt", { step: 2 }, true);
  localStorage.setItem("lance-ui:games:pond", "{");
  expect(readGameSave("pond")).toBeNull();
  expect(readGameSave("quilt")).toEqual({ step: 2 });
  expect(hasGameProgress("pond")).toBe(false);
});

test("keeps the latest action in this tab when storage is full, then persists on recovery", () => {
  writeGameSave("toy-repair", { step: 1 }, true);
  const oversized = { step: 2, payload: "x".repeat(5_000_000) };
  writeGameSave("toy-repair", oversized, true);
  expect(storageUnavailable()).toBe(true);
  expect(readGameSave("toy-repair")).toEqual(oversized);
  expect(JSON.parse(localStorage.getItem("lance-ui:games:toy-repair")!).data).toEqual({ step: 1 });
  writeGameSave("toy-repair", { step: 3 }, false);
  expect(storageUnavailable()).toBe(false);
  expect(JSON.parse(localStorage.getItem("lance-ui:games:toy-repair")!).data).toEqual({ step: 3 });
});
