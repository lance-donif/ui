import { describe, expect, it } from 'vitest';
import { emptySave, jump, landings, levels, outcome, replay, restoreSave, unlocked } from './game';
import type { Level, PondSave } from './game';

function getLevel(id: string): Level {
  const level = levels.find(candidate => candidate.id === id);
  if (!level) throw new Error(`Unknown test level: ${id}`);
  return level;
}

const routes = [
  { id: 'first', moves: [3, 0] },
  { id: 'floating', moves: [4, 1, 2] },
  { id: 'pennant', moves: [3, 0, 1, 2] },
  { id: 'sluice', moves: [6, 7, 4, 1, 2] },
  { id: 'flowerwalk', moves: [7, 8, 5, 2, 1, 0] },
  { id: 'bridges', moves: [6, 3, 0, 1, 2, 5, 8] },
  { id: 'nightfall', moves: [7, 8, 5, 4, 3, 0, 1, 2] },
];

describe('playable routes', () => {
  it('covers every published level', () => {
    expect(routes.map(route => route.id).sort()).toEqual(levels.map(level => level.id).sort());
  });

  it.each(routes)('can reach the flag in $id', ({ id, moves }) => {
    const level = getLevel(id);
    let pos = replay(level, []);
    for (const cell of moves) {
      expect(outcome(level, pos)).toBe('playing');
      expect(landings(level, pos)).toContain(cell);
      pos = jump(level, pos, cell);
    }
    expect(pos).toEqual(replay(level, moves));
    expect(pos.frog).toBe(level.flag);
    expect(pos.left).toBe(level.limit - moves.length);
    expect(outcome(level, pos)).toBe('win');
    expect(landings(level, pos)).toEqual([]);
    expect(jump(level, pos, level.start)).toBe(pos);
  });

  it('distinguishes a dead end, exhausted steps, and a winning final step', () => {
    const level = getLevel('pennant');
    const start = replay(level, []);
    expect(landings(level, start)).toEqual([3, 5]);
    const deadEnd = jump(level, start, 5);
    expect(deadEnd.left).toBe(3);
    expect(outcome(level, deadEnd)).toBe('stranded');
    const exhausted = replay(level, [3, 6, 7, 8]);
    expect(exhausted.left).toBe(0);
    expect(outcome(level, exhausted)).toBe('empty');
    const win = replay(level, [3, 0, 1, 2]);
    expect(win.left).toBe(0);
    expect(outcome(level, win)).toBe('win');
  });

  it('rejects water, diagonal jumps, current cell, and locked gates without consuming steps', () => {
    const level = getLevel('sluice');
    const start = replay(level, []);
    for (const invalid of [0, 1, 3, 5, 7, -1, 9]) {
      expect(jump(level, start, invalid)).toBe(start);
    }
    const beforeKey = replay(level, [4, 1]);
    expect(beforeKey.sunk).toEqual([4]);
    expect(landings(level, beforeKey)).not.toContain(level.flag);
    expect(jump(level, beforeKey, level.flag)).toBe(beforeKey);
    expect(outcome(level, beforeKey)).toBe('stranded');
  });
});

describe('断叶水闸', () => {
  const level = getLevel('sluice');
  const flowerRoute = [6, 7, 8, 7, 4, 1, 2];

  it('allows a five-step clear and an optional seven-step flower clear', () => {
    const quick = replay(level, [6, 7, 4, 1, 2]);
    expect(quick).toMatchObject({ frog: 2, left: 2, key: true, flower: false, sunk: [4] });
    expect(outcome(level, quick)).toBe('win');
    const complete = replay(level, flowerRoute);
    expect(complete).toMatchObject({ frog: 2, left: 0, key: true, flower: true, sunk: [4] });
    expect(outcome(level, complete)).toBe('win');
  });

  it('restores the cracked pad and earlier choices on successive undos', () => {
    const history = flowerRoute.slice(0, -1);
    const afterLeaving = replay(level, history);
    expect(afterLeaving).toMatchObject({ frog: 1, left: 1, key: true, flower: true, sunk: [4] });
    expect(landings(level, afterLeaving)).toEqual([2]);

    const backOnCrack = replay(level, history.slice(0, -1));
    expect(backOnCrack).toMatchObject({ frog: 4, left: 2, key: true, flower: true, sunk: [] });
    expect(landings(level, backOnCrack)).toEqual(expect.arrayContaining([1, 7]));

    const beforeCrack = replay(level, history.slice(0, -2));
    expect(beforeCrack).toMatchObject({ frog: 7, left: 3, key: true, flower: true, sunk: [] });
    expect(landings(level, beforeCrack)).toContain(4);
    expect(jump(level, beforeCrack, 4)).toEqual(backOnCrack);
    expect(replay(level, flowerRoute.slice(0, 2)).flower).toBe(false);
    expect(replay(level, []).key).toBe(false);
  });
});

describe('saved progress', () => {
  it('restores resumable history, favorites, fastest score and earned flower independently', () => {
    const saved: PondSave = {
      version: 1,
      runs: { sluice: [6, 7, 8, 7, 4, 1], pennant: [3, 0, 1] },
      records: { sluice: { best: 5, flower: true } },
      favorites: ['pennant', 'sluice'],
      recent: 'sluice',
    };
    const restored = restoreSave(JSON.parse(JSON.stringify(saved)));
    expect(restored).toEqual(saved);
    expect(replay(getLevel('sluice'), restored.runs.sluice)).toMatchObject({ left: 1, sunk: [4], flower: true });
  });

  it('drops incompatible saves and rejects broken fields without losing a separate valid run', () => {
    expect(restoreSave(null)).toEqual(emptySave());
    expect(restoreSave({ version: 2 } as unknown as PondSave)).toEqual(emptySave());
    const damaged = {
      version: 1,
      runs: { first: [3, 0], floating: [99], pennant: [3, 6], sluice: [6, 7.1], bridges: 'corrupt' },
      records: { first: { best: 0 }, floating: { best: 4 }, pennant: { best: 4, flower: 'true' } },
      favorites: ['first', 'first', 'missing'],
      recent: 'missing',
    };
    expect(restoreSave(damaged as unknown as PondSave)).toEqual({
      version: 1, runs: { pennant: [3, 6] }, records: { pennant: { best: 4, flower: false } },
      favorites: ['first'], recent: 'pennant',
    });
  });

  it('accepts only an actually saved level as the most recent run', () => {
    const saved = { ...emptySave(), runs: { pennant: [3] }, recent: '__proto__' };
    expect(restoreSave(saved).recent).toBe('pennant');
  });

  it('opens each pond at its first level and unlocks following levels on completion', () => {
    const saved = emptySave();
    for (const id of ['first', 'sluice', 'flowerwalk']) expect(unlocked(getLevel(id), saved.records)).toBe(true);
    for (const id of ['floating', 'pennant', 'bridges', 'nightfall']) expect(unlocked(getLevel(id), saved.records)).toBe(false);
    saved.records.first = { best: 2, flower: false };
    expect(unlocked(getLevel('floating'), saved.records)).toBe(true);
    expect(unlocked(getLevel('pennant'), saved.records)).toBe(false);
    saved.records.floating = { best: 3, flower: false };
    expect(unlocked(getLevel('pennant'), saved.records)).toBe(true);
    saved.records.flowerwalk = { best: 2, flower: false };
    expect(unlocked(getLevel('bridges'), saved.records)).toBe(true);
    saved.records.bridges = { best: 7, flower: false };
    expect(unlocked(getLevel('nightfall'), saved.records)).toBe(true);
  });
});
