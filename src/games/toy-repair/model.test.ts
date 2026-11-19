import { describe, expect, it } from "vitest";
import {
  choosePlan,
  completeAction,
  currentAction,
  deliver,
  diagnose,
  freshSave,
  holes,
  newJob,
  normalizeSave,
  observation,
  recordTest,
  repairActions,
  retryRepair,
  screws,
  type Fault,
  type Job,
  type StudioSave,
} from "./model";

function repairAll(job: Job, weakStep: number | null = null) {
  let next = job;
  for (let turns = 0; next.phase === "repair" && turns < 30; turns++) {
    next = completeAction(next, next.step !== weakStep, null);
  }
  expect(next.phase).toBe("trial");
  return next;
}
describe("玩具的实际工序", () => {
  it("五次穿针沿六个不同落点交替，拉松线尾只返工收线和剪线", () => {
    let job = completeAction(newJob("bear", 0, "keep", 1), true, null);
    job = completeAction(job, true, null);
    for (let i = 0; i < 5; i++) {
      const action = currentAction(job, null);
      expect([action?.from, action?.to]).toEqual([holes[i], holes[i + 1]]);
      job = completeAction(job, true, null);
    }
    job = repairAll(job, 2);
    job = completeAction(job, true, null);
    expect(job.phase).toBe("fail");
    job = retryRepair(job);
    expect(currentAction(job, null)?.id).toBe("tight");
    expect(completeAction(repairAll(job), true, null).phase).toBe("pass");
  });
  it("四角拆装方向相反，偏轴只退回到夹齿轮", () => {
    let job = completeAction(newJob("car", 0, "keep", 2), true, null);
    for (const [i, point] of screws.entries()) {
      expect(currentAction(job, null)).toMatchObject({
        id: "unscrew",
        from: point,
        turn: -90,
      });
      expect(job.repeat).toBe(i);
      job = completeAction(job, true, null);
    }
    expect(currentAction(job, null)?.id).toBe("lift");
    job = repairAll(job, 2);
    expect(currentAction(job, null)?.turn).toBe(360);
    job = retryRepair(completeAction(job, true, null));
    expect(currentAction(job, null)?.id).toBe("gear");
    expect(repairActions(job).find((a) => a.id === "fasten")?.turn).toBe(90);
  });
});
describe("诊断、资源与返工", () => {
  for (const kind of ["music", "wind"] as const) {
    for (const fault of [0, 1] as const) {
      for (const route of ["keep", "swap"] as const) {
        it(kind + " 故障 " + fault + " / " + route, () => {
          let job = newJob(kind, fault, route === "keep" ? "keep" : "quick", 5);
          const other = newJob(kind, (1 - fault) as Fault, "keep", 6);
          expect(observation(job, "direct")).not.toBe(
            observation(other, "direct"),
          );
          job = recordTest(job, "drive");
          if (kind === "wind") {
            expect(observation(job, "drive")).toBe(observation(other, "drive"));
            expect(
              diagnose({ ...job, phase: "diagnose" }, "drive", fault).job.phase,
            ).toBe("tests");
          }
          job = recordTest(job, "direct");
          const wrong = diagnose(
            { ...job, phase: "diagnose" },
            "direct",
            (1 - fault) as Fault,
          ).job;
          expect(wrong).toMatchObject({ phase: "diagnose", guesses: 1 });
          job = choosePlan(diagnose(wrong, "direct", fault).job, route);
          const actions = repairActions(job);
          expect(actions).toHaveLength(route === "keep" ? 3 : 2);
          const weak = actions.findIndex((a) => a.precision);
          job = completeAction(repairAll(job, weak), true, null);
          expect(job.phase).toBe("fail");
          job = retryRepair(job);
          expect(job.step).toBe(weak);
          job = completeAction(repairAll(job), true, null);
          expect(job).toMatchObject({
            phase: "pass",
            spent: route === "swap" ? 1 : 0,
            reworks: 1,
            evidence: ["drive", "direct"],
          });
          const delivered = deliver(
            { ...freshSave(), active: { [kind]: job } },
            kind,
            99,
          );
          expect(delivered.active).toEqual({});
          expect(delivered.history[0]).toMatchObject({
            serial: 5,
            delivered: 99,
          });
          expect(deliver(delivered, kind, 100)).toBe(delivered);
        });
      }
    }
  }
});
describe("继续与局部坏档", () => {
  it("保留有效委托和手册，丢弃不可执行的工序", () => {
    const bear = newJob("bear", 0, "keep", 1);
    const expired = {
      ...newJob("music", 0, "quick", 2),
      phase: "repair",
      step: 99,
    };
    const old = { ...newJob("car", 0, "keep", 3), phase: "pass", delivered: 3 };
    const broken = {
      last: "constructor",
      active: { bear, music: expired, wind: null },
      history: [null, old, {}],
    };
    const save = normalizeSave(broken as unknown as StudioSave);
    expect(Object.keys(save.active)).toEqual(["bear"]);
    expect(save.history.map((i) => i.kind)).toEqual(["car"]);
    expect(save.last).toBe("bear");
    expect(save.sound).toBe(true);
  });
  it("保留静音设置，最近交付后回到仍在修的玩具", () => {
    const remaining = newJob("wind", 1, "quick", 6);
    const save = normalizeSave({
      ...freshSave(),
      last: "car",
      sound: false,
      active: { wind: remaining },
    });
    expect(save.last).toBe("wind");
    expect(save.sound).toBe(false);
  });
  it("证据残缺时回到可以继续观察的测试", () => {
    const existing = {
      ...newJob("music", 1, "keep", 7),
      phase: "diagnose",
      evidence: null,
    };
    const save = normalizeSave({
      active: { music: existing },
    } as unknown as StudioSave);
    expect(save.active.music?.phase).toBe("tests");
  });
});
