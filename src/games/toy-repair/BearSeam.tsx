import { useEffect, useRef, useState } from "react";
import clothUrl from "./art/bear-seam.webp";
import cottonUrl from "./art/cotton.webp";
import needleUrl from "./art/needle-tip.webp";
import {
  armGrip,
  armPulled,
  closedHoles,
  cottonMouth,
  cottonTip,
  fabricReach,
  fabricSize,
  gapAt,
  needleHole,
  seamCenter,
  tailEnd,
} from "./bearSeamGeometry";
import type { Action, Job, Point } from "./model";
import "./bear-seam.css";

const toPixel = (n: number) => (n * fabricSize) / 100;
const pos = ([x, y]: Point) => ({ left: x + "%", top: y + "%" });
const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function paintFabric(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  batting: HTMLImageElement | null,
  sewn: number,
  oldCount: number,
  progress: number,
  pull: number,
  loose: boolean,
) {
  ctx.drawImage(img, 0, 0, fabricSize, fabricSize);
  const reach = toPixel(fabricReach);
  for (let row = 181; row < 465; row++) {
    const y = (row * 100) / fabricSize,
      x = toPixel(seamCenter(y));
    const current = gapAt(y, sewn, pull, loose),
      previous = gapAt(y, oldCount, pull, loose);
    const gap = toPixel(previous + (current - previous) * progress);
    if (gap < 0.12) continue;
    ctx.drawImage(
      img,
      x - reach,
      row,
      reach,
      1,
      x - reach,
      row,
      reach - gap,
      1,
    );
    ctx.drawImage(img, x, row, reach, 1, x + gap, row, reach - gap, 1);
    ctx.drawImage(
      img,
      459,
      row,
      gap * 2 + 1,
      1,
      x - gap - 0.25,
      row,
      2 * gap + 0.5,
      1,
    );
    const lining = ctx.createLinearGradient(x - gap, 0, x + gap, 0);
    lining.addColorStop(0, "rgba(109,58,32,.66)");
    lining.addColorStop(0.17, "rgba(56,32,21,.84)");
    lining.addColorStop(0.56, "rgba(49,30,22,.86)");
    lining.addColorStop(1, "rgba(110,62,36,.66)");
    ctx.fillStyle = lining;
    ctx.fillRect(x - gap - 0.25, row, 2 * gap + 0.5, 1);
    if (batting?.complete && batting.naturalWidth) {
      const at = (y - 43.5) / 7.2;
      if (at > -1 && at < 1 && gap > 1) {
        const thickness = gap * 0.78 * Math.sqrt(1 - at * at);
        ctx.globalAlpha = 0.67;
        ctx.drawImage(
          batting,
          90,
          122 + at * 33,
          40,
          1,
          x + gap - thickness,
          row,
          thickness,
          1,
        );
        ctx.globalAlpha = 1;
      }
    }
  }
}
function drawCord(ctx: CanvasRenderingContext2D, path: Path2D, weight: number) {
  ctx.save();
  ctx.lineCap = "round";
  function stroke(color: string, width: number, dy: number) {
    ctx.save();
    ctx.translate(0, dy);
    ctx.strokeStyle = color;
    ctx.lineWidth = width * weight;
    ctx.stroke(path);
    ctx.restore();
  }
  stroke("#795234", 7, 1.1);
  stroke("#f3d6a1", 5.1, 0);
  ctx.setLineDash([2.7, 6]);
  stroke("#fff2d3", 1.35, -0.7);
  ctx.restore();
}
function thread(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  bow: number,
  weight = 1,
) {
  const [ax, ay] = start.map(toPixel),
    [bx, by] = end.map(toPixel);
  const path = new Path2D();
  path.moveTo(ax, ay);
  path.quadraticCurveTo(
    (ax + bx) / 2 + bow,
    (ay + by) / 2 + Math.abs(bow) * 0.6,
    bx,
    by,
  );
  drawCord(ctx, path, weight);
}
function workingThread(
  ctx: CanvasRenderingContext2D,
  start: Point,
  eye: Point,
  needleWidth: number,
) {
  const [ax, ay] = start.map(toPixel),
    [bx, by] = eye.map(toPixel);
  const width = toPixel(needleWidth);
  const path = new Path2D();
  path.moveTo(ax, ay);
  path.bezierCurveTo(
    ax + width * 0.52,
    ay + width * 0.67,
    bx + width * 1.15,
    by + width * 1.32,
    bx,
    by,
  );
  drawCord(ctx, path, 0.93);
}
function sewnThread(
  ctx: CanvasRenderingContext2D,
  a: Point,
  b: Point,
  slack: boolean,
) {
  const ax = toPixel(a[0]),
    ay = toPixel(a[1]),
    dx = toPixel(b[0] - a[0]),
    dy = toPixel(b[1] - a[1]);
  const sample = (t: number) =>
    [
      ax + dx * t * t * (3 - 2 * t) + (slack ? 9 * Math.sin(Math.PI * t) : 0),
      ay +
        dy *
          (3 * t * (1 - t) * (1 - t) * 0.88 +
            3 * t * t * (1 - t) * 0.12 +
            t * t * t),
    ] satisfies Point;
  const steps = 30;
  ctx.save();
  ctx.lineCap = "round";
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps,
      lift = Math.min(1, Math.min(t, 1 - t) / 0.31);
    const a = sample(i / steps),
      b = sample((i + 1) / steps);
    const width = 1.1 + 4.3 * lift;
    ctx.globalAlpha = lift * 0.85 + 0.08;
    function strand(color: string, w: number, offset: number) {
      ctx.beginPath();
      ctx.moveTo(a[0], a[1] + offset);
      ctx.lineTo(b[0], b[1] + offset);
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.stroke();
    }
    strand("rgba(109,72,48,.6)", width + 1.2, 0.9);
    strand("#f6dba8", width, 0);
    if (i % 5 < 2) strand("#fff2d3", width * 0.21, -0.64);
  }
  ctx.restore();
}
function puncture(ctx: CanvasRenderingContext2D, p: Point, used: boolean) {
  const x = toPixel(p[0]),
    y = toPixel(p[1]);
  ctx.beginPath();
  ctx.ellipse(x, y, used ? 2.4 : 5.3, used ? 1.7 : 3.5, -0.7, 0, Math.PI * 2);
  ctx.fillStyle = "#65402c";
  ctx.fill();
  ctx.lineWidth = 1.3;
  ctx.strokeStyle = "#c39367";
  ctx.stroke();
}
type Props = {
  job: Job;
  action: Action | null;
  contact: Point | null;
  needleReady: boolean;
};
export default function BearSeam({ job, action, contact, needleReady }: Props) {
  const source = useRef<HTMLImageElement>(null),
    batting = useRef<HTMLImageElement>(null),
    needle = useRef<HTMLImageElement>(null),
    fabric = useRef<HTMLCanvasElement>(null),
    over = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const stage = action?.id,
    sewn =
      job.phase === "inspect" || job.step < 1
        ? 0
        : job.step === 1
          ? job.repeat
          : 5;
  const loose =
    job.phase === "fail" || (job.phase === "trial" && job.weak !== null);
  const checking = stage === "inspect-arm" || stage === "trial";
  const pull =
    checking && contact
      ? Math.max(
          0,
          Math.min(1, (contact[0] - armGrip[0]) / (armPulled[0] - armGrip[0])),
        )
      : 0;
  const sewing = stage === "stitch";
  const prior =
    sewn > 0 && (sewing || (stage === "tight" && job.reworks === 0))
      ? sewn - 1
      : sewn;
  const showHoles = sewing || sewn > 0;
  useEffect(() => {
    if (!loaded || !source.current || !fabric.current) return;
    const img = source.current,
      ctx = fabric.current.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    const start = performance.now();
    const animate =
      prior !== sewn &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function render(t: number) {
      if (!ctx) return;
      const f = animate ? Math.min(1, (t - start) / 180) : 1,
        blend = f * f * (3 - 2 * f);
      paintFabric(ctx, img, batting.current, sewn, prior, blend, pull, loose);
      const points = closedHoles.map((_, i) => {
        const a = needleHole(i, prior),
          b = needleHole(i, sewn);
        return [a[0] + (b[0] - a[0]) * blend, b[1]] satisfies Point;
      });
      if (showHoles)
        points.forEach((p, i) => puncture(ctx, p, i <= sewn && sewn > 0));
      for (let i = 0; i < sewn; i++)
        sewnThread(ctx, points[i], points[i + 1], loose && i === 4);
      if (f < 1) frame = requestAnimationFrame(render);
    }
    render(start);
    return () => cancelAnimationFrame(frame);
  }, [loaded, prior, sewn, pull, loose, showHoles]);

  const target = sewing ? needleHole(sewn + 1, sewn) : null;
  const tip =
    sewing && needleReady
      ? contact && target && distance(contact, target) < 2.8
        ? target
        : (contact ?? needleHole(sewn, sewn))
      : null;
  useEffect(() => {
    if (!loaded || !over.current) return;
    const ctx = over.current.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, fabricSize, fabricSize);
    if (sewing && tip && needle.current && over.current.clientWidth) {
      const needleWidth =
        (needle.current.getBoundingClientRect().width * 100) /
        over.current.clientWidth;
      workingThread(
        ctx,
        needleHole(sewn, sewn),
        [tip[0] + (needleWidth * 185.5) / 225, tip[1] - needleWidth],
        needleWidth,
      );
    } else if (stage === "cut" || stage === "tight") {
      const end = stage === "tight" && contact ? contact : tailEnd;
      thread(
        ctx,
        closedHoles[5],
        end,
        stage === "tight" && !contact ? 8 : 2,
        0.82,
      );
    } else if (sewn === 5) {
      const p = closedHoles[5];
      thread(ctx, [p[0] - 0.33, p[1]], [p[0] + 0.45, p[1] - 0.25], 1.3, 0.84);
    }
  });
  const showCotton = job.phase === "inspect" || stage === "tuck";
  const cottonPosition: Point =
    stage === "tuck" && contact
      ? contact
      : [cottonTip[0] + pull * 1.2, cottonTip[1]];
  const stuffing =
    stage === "tuck" && contact
      ? Math.min(
          1,
          distance(contact, cottonMouth) / distance(cottonTip, cottonMouth),
        )
      : 1;
  return (
    <>
      <img ref={batting} src={cottonUrl} hidden alt="" />
      <img
        className="tr-bear-photo"
        ref={source}
        src={clothUrl}
        onLoad={() => setLoaded(true)}
        alt=""
        draggable={false}
      />
      <canvas
        ref={fabric}
        className="tr-bear-fabric"
        width={fabricSize}
        height={fabricSize}
        role="img"
        aria-label={"小熊右臂接缝，已缝 " + sewn + " 针"}
      />
      <canvas
        ref={over}
        className="tr-bear-thread"
        width={fabricSize}
        height={fabricSize}
        aria-hidden="true"
      />
      {showCotton && (
        <img
          className="tr-bear-cotton"
          src={cottonUrl}
          alt=""
          style={{ ...pos(cottonPosition), width: 5 + 13 * stuffing + "%" }}
        />
      )}
      {tip && (
        <img
          ref={needle}
          className="tr-bear-needle"
          src={needleUrl}
          alt=""
          style={pos(tip)}
        />
      )}
    </>
  );
}
