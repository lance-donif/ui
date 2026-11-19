import { expect, type CDPSession, type Locator, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

export function button(page: Page, name: string | RegExp) {
  return page.getByRole("button", { name, exact: typeof name === "string" });
}

export async function press(control: Locator, testInfo: TestInfo) {
  if (testInfo.project.use.hasTouch) await control.tap();
  else await control.click();
}

export async function enterGame(page: Page, id: string, testInfo: TestInfo) {
  await page.goto("./");
  await press(page.locator(`a[data-game="${id}"]`), testInfo);
  await expect(page).toHaveURL(new RegExp(`#/${id}$`));
}

export async function box(control: Locator) {
  const rect = await control.boundingBox();
  if (!rect || !rect.width || !rect.height) throw new Error("The control has no visible layout box");
  return rect;
}

type Point = { x: number; y: number };

const fingers = new WeakMap<Page, Promise<CDPSession>>();

export function touchSession(page: Page) {
  let session = fingers.get(page);
  if (!session) {
    session = page.context().newCDPSession(page);
    fingers.set(page, session);
  }
  return session;
}

export async function drag(page: Page, from: Point, to: Point, testInfo: TestInfo) {
  const path = Array.from({ length: 5 }, (_, step) => ({
    x: from.x + (to.x - from.x) * step / 4,
    y: from.y + (to.y - from.y) * step / 4,
  }));
  await gesture(page, path, testInfo);
}

export async function gesture(page: Page, path: Point[], testInfo: TestInfo) {
  const [from, ...moves] = path;
  if (!testInfo.project.use.hasTouch) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    for (const point of moves) await page.mouse.move(point.x, point.y);
    await page.mouse.up();
    return;
  }
  const session = await touchSession(page);
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [from] });
  for (const point of moves) {
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point] });
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

export async function captureDesign(page: Page, testInfo: TestInfo, name: string, landmarks: Record<string, Locator>) {
  if (testInfo.project.name !== "mobile") return;
  await page.evaluate(async () => {
    window.scrollTo({ top: 0, behavior: "instant" });
    await document.fonts.ready;
    await Promise.all(Array.from(document.images, image => image.decode()));
    await new Promise(requestAnimationFrame);
    const transitions = document.getAnimations().filter(animation => {
      const timing = animation.effect?.getComputedTiming();
      return animation.playState === "running" && timing && Number.isFinite(timing.endTime);
    });
    await Promise.allSettled(transitions.map(animation => animation.finished));
  });
  const viewport = page.viewportSize();
  const elements = Object.fromEntries(await Promise.all(
    Object.entries(landmarks).map(async ([label, locator]) => [label, await box(locator)]),
  ));
  const image = testInfo.outputPath(`design-${name}.png`);
  await page.screenshot({ path: image, animations: "disabled" });
  await writeFile(testInfo.outputPath(`design-${name}.json`), JSON.stringify({ viewport, elements }));
  await testInfo.attach(name, { path: image, contentType: "image/png" });
}
