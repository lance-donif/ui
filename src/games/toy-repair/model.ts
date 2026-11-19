import {
  armGrip,
  armPulled,
  closedHoles,
  cottonMouth,
  cottonTip,
  needleHole,
  tailEnd,
} from "./bearSeamGeometry";
export const kinds = ["bear", "car", "music", "wind"] as const;
export type Kind = (typeof kinds)[number];
export type Fault = 0 | 1;
export type Preference = "keep" | "quick";
export type Tool =
  | "hand"
  | "tweezers"
  | "needle"
  | "scissors"
  | "driver"
  | "key";
export type Test = "drive" | "direct";
export type Phase =
  | "inspect"
  | "tests"
  | "diagnose"
  | "choose"
  | "repair"
  | "trial"
  | "pass"
  | "fail";
export type Point = [number, number];
export interface Job {
  kind: Kind;
  fault: Fault;
  preference: Preference;
  phase: Phase;
  route: "keep" | "swap";
  evidence: Test[];
  testing: Test | null;
  evidenceUse: Test | null;
  guesses: number;
  step: number;
  repeat: number;
  weak: number | null;
  spent: number;
  reworks: number;
  operations: number;
  savedAngle: number;
  serial: number;
}
export interface Ticket extends Job {
  delivered: number;
}
export interface StudioSave {
  active: Partial<Record<Kind, Job>>;
  history: Ticket[];
  last: Kind;
  sound: boolean;
}
export const freshSave = (): StudioSave => ({
  active: {},
  history: [],
  last: "bear",
  sound: true,
});
export const toys = {
  bear: {
    name: "小熊玩偶",
    id: "0218",
    chapter: "布偶缝补",
    quote: "一抱它，右胳膊就露出棉花。",
    customer: "朵朵",
    color: "#c87d59",
    mat: "bear-seam",
    tools: ["hand", "tweezers", "needle", "scissors"],
  },
  car: {
    name: "发条小车",
    id: "0219",
    chapter: "机械传动",
    quote: "钥匙还能转，可后轮一点也不动。",
    customer: "阿树",
    color: "#488d8a",
    mat: "car-base",
    tools: ["hand", "driver", "tweezers", "key"],
  },
  music: {
    name: "兔子音乐盒",
    id: "0220",
    chapter: "声音诊断",
    quote: "上了发条，熟悉的旋律却没有响。",
    customer: "栗子",
    color: "#aa615f",
    mat: "music-base",
    tools: ["hand", "key", "tweezers", "driver"],
  },
  wind: {
    name: "木制风车",
    id: "0221",
    chapter: "风轮调校",
    quote: "风吹进了窗，叶片还是不肯转。",
    customer: "小满",
    color: "#738e65",
    mat: "wind-base",
    tools: ["hand", "tweezers", "driver"],
  },
} as const;
export const toolNames: Record<Tool, string> = {
  hand: "手套",
  tweezers: "镊子",
  needle: "针线",
  scissors: "剪刀",
  driver: "螺丝刀",
  key: "发条钥匙",
};
export const advanced = (k: Kind) => k === "music" || k === "wind";
export function newJob(
  kind: Kind,
  fault: Fault,
  preference: Preference,
  serial: number,
): Job {
  return {
    kind,
    fault,
    preference,
    serial,
    phase: advanced(kind) ? "tests" : "inspect",
    route: "keep",
    testing: null,
    evidence: [],
    evidenceUse: null,
    guesses: 0,
    step: 0,
    repeat: 0,
    weak: null,
    spent: 0,
    reworks: 0,
    operations: 0,
    savedAngle: 0,
  };
}
const phases: Phase[] = [
  "inspect",
  "tests",
  "diagnose",
  "choose",
  "repair",
  "trial",
  "pass",
  "fail",
];
function restoreJob(value: unknown, kind: Kind): Job | null {
  if (!value || typeof value !== "object") return null;
  const j = value as Partial<Job>;
  if (
    j.kind !== kind ||
    !j.phase ||
    !phases.includes(j.phase) ||
    !Number.isSafeInteger(j.serial) ||
    (j.fault !== 0 && j.fault !== 1) ||
    (j.preference !== "keep" && j.preference !== "quick") ||
    (j.route !== "keep" && j.route !== "swap")
  )
    return null;
  if (
    (!advanced(kind) && ["tests", "diagnose", "choose"].includes(j.phase)) ||
    (advanced(kind) && j.phase === "inspect")
  )
    return null;
  const job = {
    ...newJob(kind, j.fault, j.preference, j.serial!),
    ...j,
  } as Job;
  if (
    !Number.isInteger(job.step) ||
    !Number.isInteger(job.repeat) ||
    job.step < 0 ||
    job.repeat < 0
  )
    return null;
  const actions = repairActions(job);
  if (
    job.step > actions.length ||
    (job.phase === "repair" &&
      (!actions[job.step] || job.repeat >= (actions[job.step].repeats ?? 1)))
  )
    return null;
  job.evidence = Array.isArray(job.evidence)
    ? [...new Set(job.evidence.filter((t) => t === "drive" || t === "direct"))]
    : [];
  job.testing =
    job.phase === "tests" &&
    (job.testing === "drive" || job.testing === "direct")
      ? job.testing
      : null;
  job.evidenceUse = job.evidence.includes(job.evidenceUse as Test)
    ? job.evidenceUse
    : null;
  if (job.phase === "diagnose" && !job.evidence.length) job.phase = "tests";
  if (
    job.weak !== null &&
    (!Number.isInteger(job.weak) || !actions[job.weak]?.precision)
  )
    job.weak = null;
  if (job.phase === "fail" && job.weak === null) job.phase = "trial";
  job.savedAngle = Number.isFinite(job.savedAngle)
    ? Math.min(360, Math.max(0, job.savedAngle))
    : 0;
  job.spent = job.spent === 1 ? 1 : 0;
  for (const key of ["guesses", "reworks", "operations"] as const)
    job[key] = Number.isSafeInteger(job[key]) ? Math.max(0, job[key]) : 0;
  return job;
}
export function normalizeSave(input: StudioSave | null): StudioSave {
  const result = freshSave();
  if (!input || typeof input !== "object") return result;
  result.sound = typeof input.sound === "boolean" ? input.sound : true;
  for (const k of kinds) {
    const job = restoreJob(input.active?.[k], k);
    if (job) result.active[k] = job;
  }
  if (Array.isArray(input.history))
    for (const item of input.history) {
      if (
        !item ||
        !kinds.includes(item.kind) ||
        !Number.isFinite(item.delivered)
      )
        continue;
      const valid = restoreJob(item, item.kind);
      if (valid?.phase === "pass")
        result.history.push({ ...valid, delivered: item.delivered });
    }
  const any = kinds.find((k) => result.active[k]);
  result.last =
    kinds.includes(input.last) && result.active[input.last]
      ? input.last
      : (any ?? (kinds.includes(input.last) ? input.last : "bear"));
  return result;
}
export const faults = {
  music: ["传动脱开", "梳齿偏移"],
  wind: ["轴帽过紧", "叶片松脱"],
} as const;
export function faultName(job: Job, index: Fault = job.fault) {
  return job.kind === "music" || job.kind === "wind"
    ? faults[job.kind][index]
    : job.kind === "bear"
      ? "右臂开线"
      : "齿轮脱位";
}
export function observation(job: Job, test: Test) {
  if (job.kind === "music")
    return test === "drive"
      ? job.fault === 0
        ? "钥匙已转，滚筒红标停在十二点。"
        : "红标转到三点，依旧没有声音。"
      : job.fault === 0
        ? "手转滚筒，梳齿发出清亮的声音。"
        : "手转滚筒，凸点经过梳齿却没有声音。";
  return test === "drive"
    ? "送风后叶片停在原位。"
    : job.fault === 0
      ? "轻拨时阻力很大，叶片与轴心一起停住。"
      : "叶片绕着轴心空转，轴心标记没有跟上。";
}
export function recordTest(job: Job, test: Test): Job {
  return {
    ...job,
    phase: "tests",
    testing: null,
    savedAngle: 0,
    evidence: job.evidence.includes(test)
      ? job.evidence
      : [...job.evidence, test],
    evidenceUse: test,
  };
}
export function diagnose(
  job: Job,
  test: Test,
  guess: Fault,
): { job: Job; message: string } {
  if (job.phase !== "diagnose" || !job.evidence.includes(test))
    return { job, message: "先完成一次测试。" };
  if (job.kind === "wind" && test === "drive")
    return {
      job: { ...job, phase: "tests" },
      message: "两种故障都会让风轮停住。再试试轻拨叶片。",
    };
  if (guess !== job.fault)
    return {
      job: { ...job, guesses: job.guesses + 1 },
      message: "这个假设和观察对不上。可以换个判断，或再做一次测试。",
    };
  return {
    job: { ...job, phase: "choose", evidenceUse: test },
    message: "证据吻合，选一种修法。",
  };
}
export function choosePlan(job: Job, route: "keep" | "swap"): Job {
  return job.phase === "choose"
    ? { ...job, phase: "repair", route, step: 0, repeat: 0 }
    : job;
}

export interface Action {
  id: string;
  title: string;
  hint: string;
  tool: Tool;
  from: Point;
  to: Point;
  turn?: number;
  repeats?: number;
  precision?: boolean;
  part?: string;
}
function drag(
  id: string,
  title: string,
  hint: string,
  tool: Tool,
  from: Point,
  to: Point,
  part?: string,
): Action {
  return { id, title, hint, tool, from, to, part };
}
function turn(
  id: string,
  title: string,
  hint: string,
  tool: Tool,
  pivot: Point,
  angle: number,
): Action {
  return { id, title, hint, tool, from: pivot, to: pivot, turn: angle };
}
export const carSocket: Point = [67, 53];
const pin: Point = [50, 51];
const plate: Point = [50, 49];
const tray: Point = [82, 80];
export const screws: Point[] = [
  [33, 35],
  [67, 35],
  [67, 61],
  [33, 61],
];
export function repairActions(job: Job): Action[] {
  if (job.kind === "bear")
    return [
      drag(
        "tuck",
        "把棉絮藏回缝口",
        "捏起棉絮，拖进标出的裂口再松手。",
        "tweezers",
        cottonTip,
        cottonMouth,
        "cotton",
      ),
      {
        ...drag(
          "stitch",
          "穿过对侧针孔",
          "从亮起的针孔起针，跨过裂口，在对侧下一孔松手。",
          "needle",
          needleHole(0, 0),
          needleHole(1, 0),
        ),
        repeats: 5,
      },
      {
        ...drag(
          "tight",
          "收紧线尾",
          "沿线拉至蓝圈中心。力度不足会使末针松动。",
          "tweezers",
          closedHoles[5],
          tailEnd,
        ),
        precision: true,
      },
      drag(
        "cut",
        "剪去余线",
        "将剪刃从线尾滑到收口标记。",
        "scissors",
        tailEnd,
        closedHoles[5],
      ),
    ];
  if (job.kind === "car")
    return [
      {
        ...turn(
          "unscrew",
          "卸下四枚螺钉",
          "从金色把手起按，绕螺钉逆时针转动。",
          "driver",
          screws[0],
          -90,
        ),
        repeats: 4,
      },
      drag(
        "lift",
        "把底盖移到托盘",
        "握住盖板移到右下方的托盘。",
        "hand",
        plate,
        tray,
        "cover",
      ),
      {
        ...drag(
          "gear",
          "让齿轮落座",
          "用镊子夹起齿轮，将中心孔对准蓝圈。",
          "tweezers",
          [22, 75],
          pin,
          "gear",
        ),
        precision: true,
      },
      turn(
        "mesh",
        "轻转检查传动",
        "转动齿轮，观察相邻小齿轮是否跟上。",
        "hand",
        pin,
        90,
      ),
      drag(
        "close",
        "装回底盖",
        "从托盘拿起盖板，对齐底盘。",
        "hand",
        tray,
        plate,
        "cover",
      ),
      {
        ...turn(
          "fasten",
          "拧紧四枚螺钉",
          "将螺丝刀压入螺槽，顺时针拧紧。",
          "driver",
          screws[0],
          90,
        ),
        repeats: 4,
      },
    ];
  const gear = job.fault === 0;
  const music = job.kind === "music";
  const socket: Point = music && !gear ? [50, 65] : pin;
  const unit = music ? (gear ? "齿轮" : "梳齿座") : gear ? "轴帽" : "叶片座";
  const part = music ? (gear ? "gear" : "comb") : gear ? "screw" : "sails";
  if (job.route === "swap")
    return [
      drag(
        "remove",
        "取出旧" + unit,
        "夹住旧组件，放进右下方托盘。",
        "tweezers",
        socket,
        tray,
        part,
      ),
      {
        ...drag(
          "install",
          "扣入新" + unit,
          "从备件盘拖起新组件，对准安装圈后松手。",
          "hand",
          [24, 77],
          socket,
          part,
        ),
        precision: true,
      },
    ];
  if (!music && gear)
    return [
      turn(
        "ease-cap",
        "回松过紧的轴帽",
        "沿圆弧逆时针回松轴帽，放开被夹紧的轮轴。",
        "driver",
        pin,
        -90,
      ),
      {
        ...drag(
          "cap-gap",
          "调出转动间隙",
          "将垫圈移入定位槽，在轴帽下留出转动余量。",
          "tweezers",
          [72, 68],
          pin,
          "screw",
        ),
        precision: true,
      },
      turn(
        "wind-check",
        "轻拨检查阻力",
        "轻转风轮。轴心应该能跟随叶片转动。",
        "hand",
        pin,
        90,
      ),
    ];
  if (!music && !gear)
    return [
      drag(
        "lift-sail",
        "夹起松脱的叶片座",
        "将叶片座夹到定位托架上。",
        "tweezers",
        [56, 57],
        [74, 73],
        "sails",
      ),
      {
        ...drag(
          "fit-sail",
          "对准叶片卡口",
          "把叶片座沿定位标记扣入轮毂。",
          "hand",
          [74, 73],
          pin,
          "sails",
        ),
        precision: true,
      },
      turn(
        "fix-sail",
        "锁紧叶片座",
        "压住轮毂，顺时针拧紧固定螺钉。",
        "driver",
        pin,
        90,
      ),
    ];
  if (gear)
    return [
      drag(
        "pick",
        "夹回原齿轮",
        "从边缘夹住部件，放在定位架上。",
        "tweezers",
        [73, 73],
        [34, 57],
        part,
      ),
      {
        ...drag(
          "align",
          "对准轴心",
          "让部件的中心孔与轴销重合，再松开。",
          "tweezers",
          [34, 57],
          pin,
          part,
        ),
        precision: true,
      },
      drag(
        "lock",
        "压紧锁环",
        "沿箭头将锁环推向轴肩，固定在定位槽里。",
        "hand",
        [50, 35],
        pin,
        "screw",
      ),
    ];
  return [
    turn(
      "loosen",
      "松开固定螺钉",
      "逆时针旋转，直到组件可以轻轻滑动。",
      "driver",
      [55, 63],
      -90,
    ),
    {
      ...drag(
        "calibrate",
        "调准梳齿间隙",
        "将组件移到定位圈中央，松手检查刻线。",
        "hand",
        [38, 72],
        socket,
        part,
      ),
      precision: true,
    },
    turn(
      "secure",
      "锁紧固定螺钉",
      "压住调整好的位置，顺时针转紧螺钉。",
      "driver",
      [55, 63],
      90,
    ),
  ];
}
export function currentAction(job: Job, test: Test | null): Action | null {
  if (job.phase === "inspect")
    return job.kind === "bear"
      ? drag(
          "inspect-arm",
          "轻拉小熊的右臂",
          "按住右臂的金色圆点，向外轻拉。",
          "hand",
          armGrip,
          armPulled,
        )
      : turn(
          "inspect-car",
          "转动发条钥匙",
          "绕钥匙中心顺时针转动，松手观察后轮。",
          "key",
          carSocket,
          90,
        );
  if (job.phase === "tests" && test) {
    if (job.kind === "music")
      return turn(
        test,
        test === "drive" ? "轻转钥匙" : "手转滚筒",
        test === "drive"
          ? "顺时针转动一格，观察红标。"
          : "缓慢转动滚筒，听一听梳齿。",
        test === "drive" ? "key" : "hand",
        test === "drive" ? [72, 52] : pin,
        90,
      );
    return test === "drive"
      ? drag(
          "drive",
          "向叶片送风",
          "从金色圆点沿风向滑到叶片边缘。",
          "hand",
          [24, 60],
          [61, 42],
        )
      : turn(
          "direct",
          "轻拨风轮",
          "绕轮毂轻转叶片，感受阻力。",
          "hand",
          [50, 53],
          90,
        );
  }
  if (job.phase === "trial")
    return job.kind === "bear"
      ? drag(
          "trial",
          "轻拉试修",
          "再轻拉一次右臂，看看针脚是否结实。",
          "hand",
          armGrip,
          armPulled,
        )
      : job.kind === "wind"
        ? drag(
            "trial",
            "在风中试转",
            "沿风向滑动送风，观察叶片能否持续转动。",
            "hand",
            [24, 60],
            [61, 42],
          )
        : turn(
            "trial",
            job.kind === "music" ? "听完整的三个音" : "上弦后松手",
            "顺时针上弦一圈，放开让玩具自行运转。",
            "key",
            job.kind === "car" ? carSocket : [74, 55],
            360,
          );
  if (job.phase !== "repair") return null;
  const action = repairActions(job)[job.step];
  if (!action) return null;
  if (action.id === "stitch")
    return {
      ...action,
      from: needleHole(job.repeat, job.repeat),
      to: needleHole(job.repeat + 1, job.repeat),
    };
  if (action.id === "unscrew" || action.id === "fasten")
    return { ...action, from: screws[job.repeat], to: screws[job.repeat] };
  return action;
}
export function completeAction(
  job: Job,
  accurate: boolean,
  test: Test | null,
): Job {
  const action = currentAction(job, test);
  if (!action) return job;
  if (job.phase === "tests" && test) return recordTest(job, test);
  if (job.phase === "inspect")
    return { ...job, phase: "repair", savedAngle: 0 };
  if (job.phase === "trial")
    return {
      ...job,
      phase: job.weak === null ? "pass" : "fail",
      savedAngle: 0,
    };
  const weak = action.precision ? (accurate ? null : job.step) : job.weak;
  if (job.repeat + 1 < (action.repeats ?? 1))
    return { ...job, repeat: job.repeat + 1, savedAngle: 0 };
  const step = job.step + 1;
  return {
    ...job,
    step,
    repeat: 0,
    weak,
    savedAngle: 0,
    operations: job.operations + 1,
    spent: action.id === "install" ? 1 : job.spent,
    phase: step === repairActions(job).length ? "trial" : "repair",
  };
}
export function retryRepair(job: Job): Job {
  return job.phase === "fail" && job.weak !== null
    ? {
        ...job,
        phase: "repair",
        step: job.weak,
        weak: null,
        repeat: 0,
        reworks: job.reworks + 1,
        savedAngle: 0,
      }
    : job;
}
export function deliver(save: StudioSave, kind: Kind, now: number): StudioSave {
  const job = save.active[kind];
  if (!job || job.phase !== "pass") return save;
  const active = { ...save.active };
  delete active[kind];
  return {
    ...save,
    active,
    history: [{ ...job, delivered: now }, ...save.history],
  };
}
