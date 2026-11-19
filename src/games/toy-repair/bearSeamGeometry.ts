import type { Point } from "./model";

// Pixel samples from the dark joint under the bow in the 622px square illustration.
export const fabricSize = 622;
const joint: Point[] = [
  [297, 178],
  [303, 198],
  [311, 228],
  [318, 268],
  [325, 308],
  [329, 348],
  [331, 388],
  [335, 428],
  [341, 458],
  [348, 478],
];
const punctures: Point[] = [
  [293, 207],
  [330, 251],
  [309, 296],
  [344, 344],
  [317, 391],
  [352, 436],
];
const percent = (pixels: number) => (pixels * 100) / fabricSize;
export const closedHoles: Point[] = punctures.map(([x, y]) => [
  percent(x),
  percent(y),
]);
export const cottonTip: Point = [57.5, 53.5];
export const cottonMouth: Point = [51.4, 44.4];
export const tailEnd: Point = [70, 64.5];
export const armGrip: Point = [63, 48];
export const armPulled: Point = [76, 48];
export const fabricReach = 15;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
function smooth(n: number) {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
}

export function seamCenter(y: number) {
  const row = (y * fabricSize) / 100;
  let i = 1;
  while (i < joint.length - 1 && joint[i][1] < row) i++;
  const a = joint[i - 1],
    b = joint[i];
  return percent(a[0] + (b[0] - a[0]) * clamp((row - a[1]) / (b[1] - a[1])));
}

// Width of one opening lip in board coordinates. Each stitch closes its own span.
export function gapAt(y: number, sewn: number, pull = 0, loose = false) {
  const profile = Math.sin(Math.PI * clamp((y - 29.5) / 44));
  const boundary = sewn === 0 ? 27 : closedHoles[Math.min(5, sewn)][1];
  const unsewn = sewn >= 5 ? 0 : smooth((y - boundary) / 4.5);
  const lastStitch = loose ? smooth((y - 61) / 6) * smooth((74 - y) / 3) : 0;
  return (
    profile * ((3.3 + pull * 2.1) * unsewn + lastStitch * (2.4 + pull * 1.8))
  );
}

export function needleHole(index: number, sewn: number): Point {
  const [x, y] = closedHoles[index],
    dx = x - seamCenter(y);
  return [
    x + Math.sign(dx) * gapAt(y, sewn) * (1 - Math.abs(dx) / fabricReach),
    y,
  ];
}
export function hitsHole(
  point: Point,
  index: number,
  sewn: number,
  boardWidth: number,
) {
  const [x, y] = point;
  const left = index % 2 === 0;
  const side = (left ? -1 : 1) * (x - seamCenter(y));
  if (side < Math.max(0.35, gapAt(y, sewn) * 0.55)) return false;
  const d = (i: number) => {
    const p = needleHole(i, sewn);
    return Math.hypot(x - p[0], y - p[1]);
  };
  const own = d(index);
  const reach = Math.max(3.8, Math.min(7.4, (22 * 100) / boardWidth));
  return own <= reach && closedHoles.every((_, i) => i === index || own < d(i));
}
