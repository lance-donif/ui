import { afterEach, expect, test, vi } from "vitest";
import { hasGameProgress, readGameSave, storageUnavailable, writeGameSave } from "./storage";

afterEach(() => {
  vi.restoreAllMocks();
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
  const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
  writeGameSave("toy-repair", { step: 2 }, true);
  expect(storageUnavailable()).toBe(true);
  expect(readGameSave("toy-repair")).toEqual({ step: 2 });
  write.mockRestore();
  writeGameSave("toy-repair", { step: 3 }, false);
  expect(storageUnavailable()).toBe(false);
  expect(JSON.parse(localStorage.getItem("lance-ui:games:toy-repair")!).data).toEqual({ step: 3 });
});
