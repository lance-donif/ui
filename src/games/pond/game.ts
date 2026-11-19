export type Region = 'dawn' | 'lotus' | 'evening';
export type Level = {
  id: string;
  name: string;
  region: Region;
  start: number;
  flag: number;
  limit: number;
  leaves: number[];
  paths?: Partial<Record<number, number[]>>;
  key?: number;
  flower?: number;
  cracks?: number[];
};

export const regions: { id: Region; name: string }[] = [
  { id: 'dawn', name: '晨光浅滩' },
  { id: 'lotus', name: '风过荷塘' },
  { id: 'evening', name: '晚荷池' },
];

export const levels: Level[] = [
  { id: 'first', name: '初次落脚', region: 'dawn', start: 6, flag: 0, limit: 2,
    leaves: [0, 3, 6], paths: { 6: [3], 3: [0] } },
  { id: 'floating', name: '浮叶之间', region: 'dawn', start: 7, flag: 2, limit: 3,
    leaves: [1, 2, 4, 5, 7], paths: { 7: [4], 4: [1, 5], 1: [2] } },
  { id: 'pennant', name: '小旗在望', region: 'dawn', start: 4, flag: 2, limit: 4,
    leaves: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    paths: { 4: [3, 5], 3: [0, 6], 0: [1], 1: [2], 6: [7], 7: [8] } },
  { id: 'sluice', name: '断叶水闸', region: 'lotus', start: 7, flag: 2, limit: 7,
    leaves: [1, 2, 4, 6, 7, 8], key: 6, flower: 8, cracks: [4] },
  { id: 'flowerwalk', name: '荷香回廊', region: 'evening', start: 6, flag: 0, limit: 6,
    leaves: [0, 1, 2, 3, 5, 6, 7, 8], flower: 8 },
  { id: 'bridges', name: '暮色双桥', region: 'evening', start: 7, flag: 8, limit: 7,
    leaves: [0, 1, 2, 3, 5, 6, 7, 8], key: 0, cracks: [6, 2] },
  { id: 'nightfall', name: '夜渡莲湾', region: 'evening', start: 6, flag: 2, limit: 8,
    leaves: [0, 1, 2, 3, 4, 5, 6, 7, 8], key: 8, flower: 0, cracks: [4, 5] },
];

export type Position = {
  frog: number;
  left: number;
  key: boolean;
  flower: boolean;
  sunk: number[];
};

export function coordinate(cell: number) {
  return String.fromCharCode(65 + cell % 3) + (Math.floor(cell / 3) + 1);
}

function adjacent(a: number, b: number) {
  return Math.abs(a % 3 - b % 3) + Math.abs(Math.floor(a / 3) - Math.floor(b / 3)) === 1;
}

export function landings(level: Level, pos: Position) {
  if (pos.left <= 0 || pos.frog === level.flag) return [];
  const candidates = level.paths ? level.paths[pos.frog] ?? [] : level.leaves.filter(cell => adjacent(cell, pos.frog));
  return candidates.filter(cell => !pos.sunk.includes(cell) && (cell !== level.flag || level.key === undefined || pos.key));
}

export function jump(level: Level, pos: Position, cell: number) {
  if (!landings(level, pos).includes(cell)) return pos;
  return {
    frog: cell,
    left: pos.left - 1,
    key: pos.key || cell === level.key,
    flower: pos.flower || cell === level.flower,
    sunk: level.cracks?.includes(pos.frog) ? [...pos.sunk, pos.frog] : pos.sunk,
  };
}

export function replay(level: Level, moves: number[]) {
  const start: Position = { frog: level.start, left: level.limit, key: false, flower: false, sunk: [] };
  return moves.reduce((p, cell) => jump(level, p, cell), start);
}

export function outcome(level: Level, pos: Position) {
  if (pos.frog === level.flag) return 'win';
  if (pos.left === 0) return 'empty';
  if (landings(level, pos).length === 0) return 'stranded';
  return 'playing';
}

export type RecordBook = Record<string, { best: number; flower: boolean }>;
export type PondSave = {
  version: 1;
  runs: Record<string, number[]>;
  records: RecordBook;
  favorites: string[];
  recent: string | null;
};

export function emptySave() {
  const save: PondSave = { version: 1, runs: {}, records: {}, favorites: [], recent: null };
  return save;
}

export function unlocked(level: Level, records: RecordBook) {
  const regionLevels = levels.filter(l => l.region === level.region);
  const index = regionLevels.indexOf(level);
  return index === 0 || !!records[regionLevels[index - 1].id];
}

export function restoreSave(stored: PondSave | null) {
  const save = emptySave();
  if (!stored || stored.version !== 1) return save;
  for (const level of levels) {
    const record = stored.records?.[level.id];
    if (record && Number.isInteger(record.best) && record.best > 0 && record.best <= level.limit) {
      save.records[level.id] = { best: record.best, flower: record.flower === true };
    }
    if (Array.isArray(stored.favorites) && stored.favorites.includes(level.id)) save.favorites.push(level.id);
    const run = stored.runs?.[level.id];
    if (Array.isArray(run) && run.length <= level.limit && run.every(Number.isInteger)) {
      const pos = replay(level, run);
      if (pos.left === level.limit - run.length && pos.frog !== level.flag) save.runs[level.id] = run;
    }
  }
  if (typeof stored.recent === 'string' && Object.hasOwn(save.runs, stored.recent)) save.recent = stored.recent;
  else save.recent = Object.keys(save.runs).at(-1) ?? null;
  return save;
}
