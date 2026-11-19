import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { box, button, drag, press } from "./play.test-utils";

test.describe.configure({ timeout: 75_000 });

async function observeAudio(page: Page) {
  const session = await page.context().newCDPSession(page);
  const contexts = new Set<string>();
  const states = new Map<string, string>();
  const sources: string[] = [];
  const output = new Map<string, string>();
  const dropped = new Set<string>();

  session.on("WebAudio.contextCreated", ({ context }) => {
    contexts.add(context.contextId);
    states.set(context.contextId, context.contextState);
  });
  session.on("WebAudio.contextChanged", ({ context }) => states.set(context.contextId, context.contextState));
  session.on("WebAudio.audioNodeCreated", ({ node }) => {
    if (node.nodeType === "Oscillator" || node.nodeType === "AudioBufferSource") sources.push(node.nodeId);
  });
  session.on("WebAudio.nodesConnected", ({ sourceId, destinationId }) => output.set(sourceId, destinationId));
  session.on("WebAudio.nodesDisconnected", ({ sourceId }) => dropped.add(sourceId));
  await session.send("WebAudio.enable");

  async function sourceCount() {
    await session.send("Runtime.evaluate", { expression: "void 0" });
    return sources.length;
  }
  function scoreTrack(source: string | undefined) {
    const envelope = source && output.get(source);
    const track = envelope && output.get(envelope);
    if (!track) throw new Error("未找到连到配乐声部的音源");
    return track;
  }
  return { contexts, states, sources, dropped, sourceCount, scoreTrack };
}

test("首次操作才启动声音，四个场景交替更换配乐并共用同一个音频上下文", async ({ page }, info) => {
  const graph = await observeAudio(page);
  await page.goto("./");
  const settings = button(page, "声音设置");
  await expect(settings).toBeVisible();
  expect(await graph.sourceCount()).toBe(0);
  expect(graph.contexts.size).toBe(0);
  await press(settings, info);
  await expect.poll(() => [...graph.states.values()]).toEqual(["running"]);
  await expect.poll(graph.sourceCount).toBeGreaterThan(0);
  await press(button(page, "关闭声音设置"), info);

  let track = graph.scoreTrack(graph.sources[0]);
  const contextId = [...graph.contexts][0];
  for (const game of ["quilt", "toy-repair", "pond"]) {
    await press(page.locator(`a[data-game="${game}"]`), info);
    const hall = page.getByRole("link", { name: /游戏大厅/ });
    await expect(hall).toBeVisible();
    await expect.poll(() => graph.dropped.has(track)).toBe(true);
    const next = graph.scoreTrack(graph.sources.at(-1));
    expect(next).not.toBe(track);
    await press(hall, info);
    await expect(settings).toBeVisible();
    await expect.poll(() => graph.dropped.has(next)).toBe(true);
    track = graph.scoreTrack(graph.sources.at(-1));
  }
  expect([...graph.contexts]).toEqual([contextId]);
  expect(graph.states.get(contextId)).toBe("running");
});

test("分别调到零仍能下棋，全部静音在刷新后保留，恢复音效后可试听", async ({ page }, info) => {
  const graph = await observeAudio(page);
  await page.goto("./");
  const open = () => press(button(page, "声音设置"), info);
  const close = () => press(button(page, "关闭声音设置"), info);
  const music = page.getByRole("slider", { name: "背景音乐" });
  const effects = page.getByRole("slider", { name: "游戏音效" });
  const mute = page.getByRole("switch", { name: "全部静音" });
  const preview = button(page, "试听音效");
  await open();
  await expect.poll(graph.sourceCount).toBeGreaterThan(0);
  const playing = graph.scoreTrack(graph.sources[0]);
  await music.press("Home");
  await expect(music).toHaveValue("0");
  await expect.poll(() => graph.dropped.has(playing)).toBe(true);
  const quietMusic = await graph.sourceCount();
  await press(preview, info);
  expect(await graph.sourceCount()).toBeGreaterThan(quietMusic);
  await effects.press("Home");
  await expect(effects).toHaveValue("0");
  await expect(preview).toBeDisabled();
  const bothZero = await graph.sourceCount();
  await close();
  await press(page.locator('a[data-game="pond"]'), info);
  await press(button(page, /开始挑战/), info);
  await press(button(page, /^A2 /), info);
  await expect(button(page, /^A2 .*青蛙所在/)).toBeVisible();
  expect(await graph.sourceCount()).toBe(bothZero);

  await open();
  await press(mute, info);
  await effects.press("End");
  await expect(effects).toHaveValue("100");
  await page.reload();
  await open();
  await expect(mute).toBeChecked();
  await expect(music).toHaveValue("0");
  await expect(effects).toHaveValue("100");
  await expect(preview).toBeDisabled();
  await close();
  await press(button(page, /^A1 /), info);
  await expect(page.getByRole("heading", { name: "抵达小旗！" })).toBeVisible();
  expect(await graph.sourceCount()).toBe(bothZero);
  await press(button(page, "下一关"), info);
  await open();
  await press(mute, info);
  await press(preview, info);
  expect(await graph.sourceCount()).toBeGreaterThan(bothZero);
});

test("听诊音乐盒，从真实故障与试修中辨出两音和修好后的三音", async ({ page }, info) => {
  const graph = await observeAudio(page);
  const click = (name: string | RegExp) => press(button(page, name), info);
  const turn = () => click("↻ 顺转 90°");
  async function place(tool: string) {
    await click(tool);
    await click("握住起点");
    await click("对准并松手");
  }
  async function wind() {
    await click("发条钥匙");
    const before = await graph.sourceCount();
    for (let i = 0; i < 3; i++) await turn();
    expect(await graph.sourceCount()).toBe(before);
    await turn();
    return (await graph.sourceCount()) - before;
  }
  await page.goto("./");
  await press(page.locator('a[data-game="toy-repair"]'), info);
  if (info.project.name === "mobile") await click("切换委托");
  await click(/兔子音乐盒/);
  await click(/接单并进入维修室/);
  await click(/手转滚筒/);
  await click("手套");
  await click("使用点按或键盘操作");
  const before = await graph.sourceCount();
  await turn();
  const report = page.getByRole("status");
  await expect(report).toContainText(/清亮的声音|没有声音/);
  const observed = await report.innerText();
  info.annotations.push({ type: "听诊结果", description: observed });
  const gear = observed.includes("清亮的声音");
  expect((await graph.sourceCount()) - before).toBe(gear ? 4 : 0);
  await click(/打开证据/);
  await click(gear ? "传动脱开" : "梳齿偏移");
  await click(/核对判断/);
  await click(/更换.*组件/);
  await place("镊子");

  if (!gear) {
    await click("手套");
    const board = page.locator(".tr-board");
    await board.scrollIntoViewIfNeeded();
    const [surface, origin, target] = await Promise.all([
      box(board), box(board.locator(".tr-origin")), box(board.locator(".tr-target")),
    ]);
    await drag(page, { x: origin.x + origin.width / 2, y: origin.y + origin.height / 2 }, {
      x: target.x + target.width / 2 + surface.width * .07, y: target.y + target.height / 2,
    }, info);
    await expect(page.getByRole("heading", { name: "听完整的三个音" })).toBeVisible();
    expect(await wind()).toBe(4);
    await expect(page.getByLabel("2 个音符亮起")).toBeVisible();
    await click(/回到故障部位/);
  }

  await place("手套");
  await expect(page.getByRole("heading", { name: "听完整的三个音" })).toBeVisible();
  expect(await wind()).toBe(6);
  await expect(page.getByLabel("3 个音符亮起")).toBeVisible();
  await expect(page.getByRole("heading", { name: "试修通过" })).toBeVisible();
});

test("原生离线渲染的音乐盒波形在 170 毫秒间隔内依次出现正确音高", async ({ page }, info) => {
  const entry = resolve(info.config.rootDir, "../src/shared/audio-cues.ts");
  const moduleText = execFileSync("bun", ["build", entry, "--target=browser"], { encoding: "utf8" });
  const results = await page.evaluate(async (source) => {
    const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
    try {
      const { renderCue } = await import(url);
      const rate = 48000;
      const frame = rate / 100;
      const render = async (cue: string) => {
        const context = new OfflineAudioContext(1, rate, rate);
        renderCue(context, context.destination, cue, 0);
        const samples = (await context.startRendering()).getChannelData(0);
        const notes = [];
        let sounded = false;
        for (let start = 0; start < samples.length; start += frame) {
          const active = samples.subarray(start, start + frame).some(v => Math.abs(v) > .006);
          if (active && !sounded) {
            let crossings = 0;
            const from = start + frame * 2;
            for (let i = from; i < from + rate / 10; i++) {
              if (samples[i - 1] < 0 && samples[i] >= 0) crossings++;
            }
            notes.push({ time: start / rate, hz: crossings * 10 });
          }
          sounded = active;
        }
        return notes;
      };
      return [await render("musicTwo"), await render("musicThree")];
    } finally {
      URL.revokeObjectURL(url);
    }
  }, moduleText);

  await info.attach("音乐盒两音与三音波形读数", { body: JSON.stringify(results), contentType: "application/json" });
  for (const [i, notes] of results.entries()) {
    const pitches = i === 0 ? [523, 659] : [523, 659, 784];
    expect(notes).toHaveLength(pitches.length);
    for (const [n, pitch] of pitches.entries()) {
      expect(Math.abs(notes[n].hz - pitch)).toBeLessThanOrEqual(10);
      expect(Math.abs(notes[n].time - n * .17)).toBeLessThanOrEqual(.01);
    }
  }
});
