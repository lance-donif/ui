export const PIECES = [
  { id: "kite", title: "风起时", season: "初学图样", size: 3, art: "kite" },
  { id: "sail", title: "蓝湾帆影", season: "标准图样", size: 4, art: "sail" },
  { id: "tulip", title: "花园来信", season: "标准图样", size: 4, art: "tulip" },
  { id: "basket", title: "春日花篮", season: "春展", size: 3, art: "basket" },
  { id: "summer", title: "夏日帆影", season: "夏展", size: 4, art: "sail" },
  { id: "leaves", title: "秋叶双针", season: "秋展", size: 3, art: "leaves" },
] as const;
export type Piece = (typeof PIECES)[number];
export type PieceId = Piece["id"];
export type Mode = "classic" | "thread" | "timed";
export type Frame = { board: number[]; pins: number };
export type Round = {
  piece: PieceId;
  mode: Mode;
  frame: Frame;
  history: Frame[];
  started: number | null;
};
export type RecordEntry = {
  classic?: number;
  thread?: number;
  timed?: number;
  time?: number;
};
export type Save = {
  recent: string[];
  rounds: Record<string, Round>;
  records: Partial<Record<PieceId, RecordEntry>>;
  loom: {
    cells: number[];
    history: number[][];
    finished: boolean;
    attached: boolean;
  };
};
export const getPiece = (id: PieceId) => PIECES.find((p) => p.id === id)!;
export const keyFor = (id: PieceId, mode: Mode) => id + "/" + mode;
export const isThread = (r: Round) =>
  r.mode === "thread" || r.piece === "leaves";
export const LEVEL_PATHS: Record<PieceId, string> = {
  kite: "LUL",
  sail: "UL",
  tulip: "ULULDRDLUL",
  basket: "ULDLURUL",
  summer: "ULULDRDLLURUL",
  leaves: "ULDLUR",
};

export function adjacent(i: number, j: number, n: number) {
  return (
    i >= 0 &&
    j >= 0 &&
    Math.abs((i % n) - (j % n)) +
      Math.abs(Math.floor(i / n) - Math.floor(j / n)) ===
      1
  );
}
export function makeRound(piece: PieceId, mode: Mode): Round {
  const n = getPiece(piece).size;
  const board = Array.from({ length: n * n }, (_, i) => (i + 1) % (n * n));
  let hole = board.length - 1;
  const offsets: Record<string, number> = { U: -n, D: n, L: -1, R: 1 };
  const path =
    piece === "kite" && mode === "thread" ? "LU" : LEVEL_PATHS[piece];
  for (const direction of path) {
    const next = hole + offsets[direction];
    if (!adjacent(hole, next, n) || next >= board.length)
      throw new Error("图样初局路径无效");
    [board[next], board[hole]] = [board[hole], board[next]];
    hole = next;
  }
  return { piece, mode, frame: { board, pins: 0 }, history: [], started: null };
}
export function pinsFor(id: PieceId): readonly [number, number] {
  if (id === "kite") return [1, 3];
  if (id === "leaves") return [2, 6];
  const n = getPiece(id).size;
  return [1, n * (n - 1)];
}
export function move(round: Round, cell: number, now = Date.now()): Round {
  const { board, pins } = round.frame;
  const hole = board.indexOf(0);
  if (
    !Number.isInteger(cell) ||
    cell >= board.length ||
    !adjacent(cell, hole, getPiece(round.piece).size)
  )
    return round;
  const result = board.slice();
  [result[cell], result[hole]] = [result[hole], result[cell]];
  const hitsPin =
    isThread(round) && pins < 2 && cell === pinsFor(round.piece)[pins];
  return {
    ...round,
    history: [...round.history, round.frame],
    frame: { board: result, pins: hitsPin ? pins + 1 : pins },
    started: round.mode === "timed" ? (round.started ?? now) : null,
  };
}
export function undo(round: Round): Round {
  const previous = round.history.at(-1);
  return previous
    ? { ...round, history: round.history.slice(0, -1), frame: previous }
    : round;
}
export function aligned(round: Round) {
  return round.frame.board.every(
    (tile, i, all) => tile === (i + 1) % all.length,
  );
}
export function finished(round: Round) {
  return aligned(round) && (!isThread(round) || round.frame.pins === 2);
}
export const STITCH = [
  1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0,
];
export const ROWS = [[1, 1, 1], [5], [3], [1], [1]];
export const COLS = [[2], [2], [5], [2], [2]];
export function solvedLabel(cells: number[]) {
  return (
    cells.length === 25 && cells.every((v, i) => (v === 1) === !!STITCH[i])
  );
}
export function groups(line: number[]) {
  const result: number[] = [];
  let count = 0;
  for (const mark of [...line, 0]) {
    if (mark === 1) count++;
    else if (count) {
      result.push(count);
      count = 0;
    }
  }
  return result;
}
export function emptySave(): Save {
  return {
    recent: [],
    rounds: {},
    records: {},
    loom: {
      cells: Array(25).fill(0),
      history: [],
      finished: false,
      attached: false,
    },
  };
}
const validCells = (v: unknown): v is number[] =>
  Array.isArray(v) && v.length === 25 && v.every((n) => [0, 1, 2].includes(n));
const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;
export function restore(raw: Save | null): Save {
  const data = emptySave();
  if (!raw || typeof raw !== "object") return data;
  for (const piece of PIECES) {
    const entry = raw.records?.[piece.id];
    if (entry) {
      const record: RecordEntry = {};
      for (const k of ["classic", "thread", "timed", "time"] as const)
        if (finite(entry[k])) record[k] = entry[k];
      if (Object.keys(record).length) data.records[piece.id] = record;
    }
    for (const mode of ["classic", "thread", "timed"] as const) {
      const key = keyFor(piece.id, mode),
        round = raw.rounds?.[key];
      const validFrame = (f: Frame) =>
        f &&
        [0, 1, 2].includes(f.pins) &&
        Array.isArray(f.board) &&
        f.board.length === piece.size ** 2 &&
        new Set(f.board).size === f.board.length &&
        f.board.every(
          (t) => Number.isInteger(t) && t >= 0 && t < f.board.length,
        );
      if (
        round?.piece === piece.id &&
        round.mode === mode &&
        validFrame(round.frame) &&
        Array.isArray(round.history) &&
        round.history.every(validFrame) &&
        (round.started === null || finite(round.started))
      )
        data.rounds[key] = round;
    }
  }
  const s = raw.loom;
  if (s && validCells(s.cells)) {
    const done = !!s.finished && solvedLabel(s.cells);
    data.loom = {
      cells: s.cells,
      history: Array.isArray(s.history) ? s.history.filter(validCells) : [],
      finished: done,
      attached: done && !!s.attached,
    };
  }
  data.recent = Array.isArray(raw.recent)
    ? raw.recent.filter(
        (k) =>
          typeof k === "string" &&
          (k === "loom" ? validCells(s?.cells) : Object.hasOwn(data.rounds, k)),
      )
    : [];
  return data;
}
export function recentWithFirst(save: Save, key: string) {
  return [
    key,
    ...save.recent.filter(
      (k) => k !== key && (k === "loom" || !!save.rounds[k]),
    ),
  ];
}
export function activeTarget(save: Save): "loom" | Round | null {
  const canResumeLoom =
    !save.loom.finished &&
    !!save.records.kite &&
    (save.loom.history.length > 0 || save.recent.includes("loom"));
  for (const key of save.recent) {
    if (key === "loom" && canResumeLoom) return "loom";
    if (save.rounds[key]) return save.rounds[key];
  }
  return Object.values(save.rounds).at(-1) ?? (canResumeLoom ? "loom" : null);
}
export function finishRecord(save: Save, round: Round, now: number): Save {
  const entry = { ...save.records[round.piece] };
  entry[round.mode] = Math.min(
    entry[round.mode] ?? Infinity,
    round.history.length,
  );
  if (round.mode === "timed" && round.started !== null)
    entry.time = Math.min(
      entry.time ?? Infinity,
      Math.max(0, now - round.started),
    );
  const rounds = { ...save.rounds };
  delete rounds[keyFor(round.piece, round.mode)];
  return {
    ...save,
    rounds,
    records: { ...save.records, [round.piece]: entry },
  };
}
export function clock(ms: number) {
  const t = Math.floor(Math.max(0, ms) / 10);
  return (
    [Math.floor(t / 6000), Math.floor(t / 100) % 60]
      .map((n) => String(n).padStart(2, "0"))
      .join(":") +
    "." +
    String(t % 100).padStart(2, "0")
  );
}
