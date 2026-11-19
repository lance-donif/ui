import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import {
  carSocket,
  currentAction,
  holes,
  screws,
  toys,
  toolNames,
  type Action,
  type Job,
  type Point,
  type Test,
  type Tool,
} from "./model";

const images = import.meta.glob<string>("./art/*.webp", {
  eager: true,
  import: "default",
});
export const asset = (name: string) => images[`./art/${name}.webp`];
const pos = (point: Point): CSSProperties => ({
  left: point[0] + "%",
  top: point[1] + "%",
});
const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export function angleDelta(next: number, previous: number) {
  return ((next - previous + 540) % 360) - 180;
}
function angle(p: Point, pivot: Point) {
  return (Math.atan2(p[1] - pivot[1], p[0] - pivot[0]) * 180) / Math.PI;
}
function layer(name: string, at: Point, width: number, css = "", deg?: number) {
  return (
    <img
      className={"tr-layer " + css}
      draggable={false}
      alt=""
      src={asset(name)}
      style={{
        ...pos(at),
        width: width + "%",
        ...(deg === undefined
          ? {}
          : { transform: `translate(-50%, -50%) rotate(${deg}deg)` }),
      }}
    />
  );
}
function stitchLines(n: number) {
  return holes.slice(0, n).map((a, i) => {
    const b = holes[i + 1];
    const length = distance(a, b);
    return (
      <i
        key={i}
        className="tr-stitch"
        style={{
          ...pos(a),
          width: length + "%",
          transform: `rotate(${angle(b, a)}deg)`,
        }}
      />
    );
  });
}
function Notes({ count }: { count: number }) {
  return (
    <div className="tr-test-notes" aria-label={count + " 个音符亮起"}>
      {["一", "二", "三"].map((name, i) => (
        <i
          key={name}
          className={i < count ? "played" : ""}
          style={{ animationDelay: i * 0.17 + "s" }}
        >
          {i < count ? "♪" : "·"}
        </i>
      ))}
    </div>
  );
}
function mountedKey(p: Point, rotation: number) {
  return (
    <img
      className="tr-mounted-key"
      src={asset("key")}
      alt=""
      draggable={false}
      style={{
        ...pos(p),
        transform: "translate(-50%, -93%) rotate(" + rotation + "deg)",
      }}
    />
  );
}
function gauge(p: Point, rotation: number, css = "") {
  return (
    <span className={"tr-gauge " + css} style={pos(p)}>
      <i style={{ transform: "rotate(" + rotation + "deg)" }} />
    </span>
  );
}
function Illustration({
  job,
  action,
  at,
  angleTurn,
  testing,
}: {
  job: Job;
  action: Action | null;
  at: Point | null;
  angleTurn: number;
  testing: Test | null;
}) {
  const stem = action?.id;
  if (job.kind === "bear") {
    const count =
      job.phase === "inspect" || job.step < 1
        ? 0
        : job.step === 1
          ? job.repeat
          : 5;
    const tug =
      at && (stem === "inspect-arm" || stem === "trial")
        ? Math.min(1, Math.max(0, (at[0] - 57) / 20))
        : 0;
    return (
      <>
        <img
          alt=""
          src={asset("bear-seam")}
          className="tr-teddy-back"
          style={{ transform: "scaleX(" + (1 + tug * 0.045) + ")" }}
        />
        {count < 5 && (
          <i
            className="tr-seam-opening"
            style={{
              height: (5 - count) * 6.7 + "%",
              top: 34 + count * 6.7 + "%",
            }}
          />
        )}
        {(job.phase === "inspect" || stem === "tuck") &&
          layer("cotton", stem === "tuck" && at ? at : [66 + tug * 3, 46], 17)}
        {stitchLines(count)}
        {stem === "stitch" &&
          holes.map((p, i) => <i key={i} className="tr-hole" style={pos(p)} />)}
        {(stem === "tight" || stem === "cut") && (
          <i
            className="tr-loose-thread"
            style={{
              ...pos(holes[5]),
              width:
                distance(holes[5], at && stem === "tight" ? at : [77, 58]) +
                "%",
              transform:
                "rotate(" +
                angle(at && stem === "tight" ? at : [77, 58], holes[5]) +
                "deg)",
            }}
          />
        )}
        {(job.phase === "fail" ||
          (job.weak !== null && job.phase === "trial")) && (
          <span className="tr-seam-gap" style={pos([54, 64])} />
        )}
      </>
    );
  }
  if (job.kind === "car") {
    if (["inspect", "trial", "pass", "fail"].includes(job.phase))
      return (
        <>
          <div className="tr-track">
            <span>终点</span>
            <i />
          </div>
          <div
            className={
              "tr-car-assembly " + (job.phase === "pass" ? "tr-drive" : "")
            }
          >
            {layer("car-body", [47, 53], 61)}
            {mountedKey(carSocket, 64 + angleTurn)}
          </div>
        </>
      );
    const uncovered = job.step >= 2 && job.step < 5;
    const remaining =
      job.step === 0
        ? 4 - job.repeat
        : job.step === 5
          ? job.repeat
          : job.step === 1 || uncovered
            ? 0
            : 4;
    return (
      <>
        {layer("car-base", [50, 50], 100)}
        {uncovered && stem !== "close" && layer("cover", [82, 80], 22)}
        {uncovered && layer("gear", [34, 51], 20, "", -angleTurn)}
        {uncovered &&
          layer(
            "gear",
            stem === "gear" ? (at ?? action!.from) : [50, 51],
            24,
            "",
            job.weak === null ? angleTurn : 0,
          )}
        {(!uncovered || stem === "close") &&
          layer(
            "cover",
            (stem === "lift" || stem === "close") && at
              ? at
              : stem === "close"
                ? [82, 80]
                : [50, 48],
            51,
          )}
        {screws.map((p, i) => {
          const placed = job.step === 0 ? i >= job.repeat : i < remaining;
          return (
            <span key={i}>
              {layer(
                "screw",
                placed ? p : [72 + i * 6, 91],
                placed ? 7 : 4,
                "",
                i === job.repeat ? angleTurn : 0,
              )}
            </span>
          );
        })}
      </>
    );
  }
  const wind = job.kind === "wind",
    repairing = job.phase === "repair";
  const visibleTest =
    job.phase === "tests" || job.phase === "diagnose"
      ? (testing ?? job.evidenceUse)
      : null;
  const reading = testing ? angleTurn : 90;
  const observedRotation =
    visibleTest &&
    (visibleTest === "direct"
      ? !wind || job.fault === 1
      : !wind && job.fault === 1)
      ? reading
      : 0;
  const repaired = job.phase === "pass",
    failed = job.phase === "fail";
  const movingPart = repairing ? action?.part : null;
  const transfer = movingPart && action;
  const sailAngle = repairing ? angleTurn : observedRotation;
  const hideSails = transfer && movingPart === "sails";
  const gaugeAngle = repairing
    ? angleTurn
    : repaired || (failed && job.fault === 1)
      ? 90
      : observedRotation;
  const notes = repaired
    ? 3
    : failed
      ? job.fault === 1
        ? 2
        : 0
      : !testing && visibleTest === "direct"
        ? job.fault === 0
          ? 2
          : 0
        : null;
  return (
    <>
      {layer(toys[job.kind].mat, [50, 50], 100)}
      {wind ? (
        <>
          {!hideSails &&
            layer("sails", [50, 53], 68, repaired ? "tr-spin" : "", sailAngle)}
          {gauge(
            [50, 53],
            repaired ? angleTurn : 0,
            repaired ? "tr-wind-hub turning" : "tr-wind-hub",
          )}
        </>
      ) : (
        <>
          {layer("barrel", [50, 50], 51)}
          {movingPart !== "comb" && layer("comb", [50, 65], 41)}
          {gauge([66, 50], gaugeAngle, repaired ? "turning" : "")}
          {action?.tool === "key" && mountedKey(action.from, 70 + angleTurn)}
          {notes !== null && <Notes count={notes} />}
        </>
      )}
      {transfer &&
        layer(
          movingPart,
          at ?? action.from,
          movingPart === "sails"
            ? 48
            : movingPart === "comb"
              ? 33
              : movingPart === "screw"
                ? 13
                : 19,
        )}
      {wind && at && (stem === "drive" || stem === "trial") && (
        <i className="tr-gust" style={{ ...pos(at) }}>
          ≋
        </i>
      )}
    </>
  );
}
interface Props {
  job: Job;
  test: Test | null;
  tool: Tool;
  onTool: (value: Tool) => void;
  assist: boolean;
  onAssist: (open: boolean) => void;
  onComplete: (accurate: boolean) => void;
  onProgress: (degrees: number) => void;
  onMessage: (text: string) => void;
}
interface Motion {
  pointer: number;
  point: Point;
  previous: number;
  progress: number;
}
export default function Workbench({
  job,
  test,
  tool,
  onTool,
  assist,
  onAssist,
  onComplete,
  onProgress,
  onMessage,
}: Props) {
  const action = currentAction(job, test);
  const board = useRef<HTMLDivElement>(null);
  const movement = useRef<Motion | null>(null);
  const [at, setAt] = useState<Point | null>(null);
  const [degrees, setDegrees] = useState(job.savedAngle);
  const [parkedAt, setParkedAt] = useState<Point | null>(null);
  const [primed, setPrimed] = useState(false);
  function relative(e: PointerEvent): Point {
    const r = board.current!.getBoundingClientRect();
    return [
      ((e.clientX - r.left) * 100) / r.width,
      ((e.clientY - r.top) * 100) / r.height,
    ];
  }
  function correctTool() {
    if (!action) return false;
    if (tool === action.tool) return true;
    onMessage("这一步需要" + toolNames[action.tool] + "。先从工具盘拿起它。");
    return false;
  }
  function down(e: PointerEvent<HTMLDivElement>) {
    if (
      !action ||
      movement.current ||
      !e.isPrimary ||
      e.button !== 0 ||
      !correctTool()
    )
      return;
    const p = relative(e);
    const d = distance(p, parkedAt ?? action.from);
    if (action.turn ? d < 3 || d > 26 : d > 12) {
      onMessage(
        action.turn ? "从金色把手起按，再绕中心转。" : "请从金色圆点起按。",
      );
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    movement.current = {
      pointer: e.pointerId,
      point: p,
      previous: angle(p, action.from),
      progress: job.savedAngle,
    };
    setAt(p);
  }
  function update(e: PointerEvent<HTMLDivElement>) {
    const m = movement.current;
    if (!action || !m || m.pointer !== e.pointerId) return;
    const p = relative(e);
    m.point = p;
    if (action.turn) {
      const next = angle(p, action.from),
        delta = angleDelta(next, m.previous) * Math.sign(action.turn);
      if (distance(p, action.from) > 2.5)
        m.progress = Math.max(
          0,
          Math.min(Math.abs(action.turn), m.progress + delta),
        );
      m.previous = next;
      setDegrees(m.progress);
    }
    setAt(p);
  }
  function end(e: PointerEvent<HTMLDivElement>) {
    const m = movement.current;
    if (!action || !m || m.pointer !== e.pointerId) return;
    update(e);
    movement.current = null;
    setAt(null);
    if (action.turn) {
      if (m.progress >= Math.abs(action.turn) - 2) onComplete(true);
      else {
        onProgress(m.progress);
        onMessage(
          m.progress > 1
            ? "已停在当前位置。继续沿箭头转。"
            : "方向相反了，跟随圆环箭头再试。",
        );
      }
    } else {
      const d = distance(relative(e), action.to);
      if (d <= (action.id === "stitch" ? 6.3 : 9.5)) onComplete(d <= 5);
      else if (action.id === "gear") {
        const p = relative(e);
        setParkedAt([
          Math.max(10, Math.min(90, p[0])),
          Math.max(10, Math.min(90, p[1])),
        ]);
        onMessage("齿轮还在镊尖上。接住金点，再把中心孔送到蓝圈。");
      } else
        onMessage(
          action.id === "stitch"
            ? "落错针孔，现有针脚仍在。请对准蓝圈。"
            : "还没对准。工具回到起点，刚才的工序会保留。",
        );
    }
  }
  function cancel(event: PointerEvent<HTMLDivElement>) {
    if (movement.current?.pointer !== event.pointerId) return;
    movement.current = null;
    setAt(null);
    setDegrees(job.savedAngle);
    onMessage("已松开工具，保留上一次落稳的位置。");
  }
  function accessibleTurn(sign: number) {
    if (!action?.turn || !correctTool()) return;
    if (sign !== Math.sign(action.turn)) {
      onMessage("方向相反，请看圆环箭头。");
      return;
    }
    const next = Math.min(Math.abs(action.turn), degrees + 90);
    setDegrees(next);
    if (next >= Math.abs(action.turn)) onComplete(true);
    else {
      onProgress(next);
      onMessage("已转过 " + Math.round(next) + "°，继续转动。");
    }
  }
  const dir = action?.turn && action.turn < 0 ? -1 : 1;
  const radians = (degrees * dir * Math.PI) / 180;
  const handle: Point = action?.turn
    ? [
        action.from[0] + 13 * Math.cos(radians),
        action.from[1] + 13 * Math.sin(radians),
      ]
    : (parkedAt ?? action?.from ?? [50, 50]);
  return (
    <div className="tr-workunit">
      {action && (
        <p className="tr-mobile-instruction">
          {action.title}　<span>{toolNames[action.tool]}</span>
        </p>
      )}
      <div
        className={"tr-board " + (!action ? "tr-still" : "")}
        ref={board}
        onPointerDown={down}
        onPointerMove={update}
        onPointerUp={end}
        onPointerCancel={cancel}
        onLostPointerCapture={cancel}
        role="group"
        aria-label={action?.title ?? "玩具特写"}
      >
        <Illustration
          job={job}
          action={action}
          testing={test}
          at={at ?? parkedAt}
          angleTurn={degrees * dir}
        />
        {action && (
          <>
            {action.turn ? (
              <div className="tr-turn-ring" style={pos(action.from)}>
                <span>{dir === 1 ? "↻" : "↺"}</span>
              </div>
            ) : (
              <span className="tr-target" style={pos(action.to)}>
                <b>＋</b>
              </span>
            )}
            <span
              className={"tr-origin " + (at ? "tr-held" : "")}
              style={pos(handle)}
            />
            {(at ?? parkedAt) &&
              tool !== "key" &&
              layer(tool, (at ?? parkedAt)!, 15, "tr-held-tool")}
            {action.turn && (
              <span className="tr-turn-value">
                {dir === 1 ? "顺时针" : "逆时针"}　{Math.round(degrees)}° /{" "}
                {Math.abs(action.turn)}°
              </span>
            )}
          </>
        )}
      </div>
      {action && (
        <>
          <div className="tr-toolbelt" aria-label="工具盘">
            {toys[job.kind].tools.map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => {
                  onTool(t);
                  setPrimed(false);
                }}
                aria-pressed={tool === t}
              >
                <img src={asset(t)} alt="" />
                {toolNames[t]}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="tr-assist"
            aria-expanded={assist}
            onClick={() => onAssist(!assist)}
          >
            {assist ? "收起点按操作" : "使用点按或键盘操作"}
          </button>
          {assist && (
            <div className="tr-assisted">
              {action.turn ? (
                <>
                  <button onClick={() => accessibleTurn(-1)}>↺ 逆转 90°</button>
                  <button onClick={() => accessibleTurn(1)}>↻ 顺转 90°</button>
                </>
              ) : (
                <>
                  <button
                    disabled={primed}
                    onClick={() => {
                      if (correctTool()) setPrimed(true);
                    }}
                  >
                    {primed ? "已握住起点" : "握住起点"}
                  </button>
                  <button
                    disabled={!primed}
                    onClick={() => {
                      if (correctTool()) onComplete(true);
                    }}
                  >
                    对准并松手
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
