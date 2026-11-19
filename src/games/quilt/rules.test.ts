import { describe, expect, it } from "vitest";
import {
  COLS,
  ROWS,
  aligned,
  clock,
  emptySave,
  finishRecord,
  finished,
  groups,
  keyFor,
  makeRound,
  move,
  restore,
  solvedLabel,
  undo,
  type Mode,
  type PieceId,
  type Round,
} from "./rules";

function slide(round: Round, tile: number, now = 1000) {
  const next = move(round, round.frame.board.indexOf(tile), now);
  expect(next.history.length).toBe(round.history.length + 1);
  return next;
}

describe("滑块与针路", () => {
  it("风筝只接受共边布块，按 4、5、8 三步归位", () => {
    const start = makeRound("kite", "classic");
    expect(start.frame.board).toEqual([1, 2, 3, 0, 4, 6, 7, 5, 8]);
    for (const cell of [-1, 2, 3, 5, 9]) expect(move(start, cell)).toBe(start);
    expect(undo(start)).toBe(start);
    const first = slide(start, 4);
    expect(first.frame.board).toEqual([1, 2, 3, 4, 0, 6, 7, 5, 8]);
    const second = slide(first, 5);
    expect(finished(second)).toBe(false);
    const final = slide(second, 8);
    expect(finished(final)).toBe(true);
    expect(final.started).toBeNull();
    expect(undo(final)).toEqual(second);
  });

  it("4 × 4 帆船保留交接图第三行空格和末尾的 12", () => {
    const round = makeRound("sail", "classic");
    expect(round.frame.board).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 0, 11, 13, 14, 15, 12,
    ]);
    expect(finished(slide(slide(round, 11), 12))).toBe(true);
  });

  it("提前穿 B 或仅还原图样不会完成，撤回同时还原针孔", () => {
    const start = makeRound("kite", "thread");
    expect(start.frame.board).toEqual([1, 2, 3, 4, 0, 6, 7, 5, 8]);
    expect(slide(start, 4).frame.pins).toBe(0);
    const early = slide(slide(start, 5), 8);
    expect(aligned(early)).toBe(true);
    expect(finished(early)).toBe(false);

    let round = start;
    const progress: number[] = [];
    for (const tile of [2, 2, 4, 4, 5, 8]) {
      const next = slide(round, tile);
      expect(undo(next)).toEqual(round);
      progress.push(next.frame.pins);
      round = next;
    }
    expect(progress).toEqual([1, 1, 2, 2, 2, 2]);
    expect(finished(round)).toBe(true);
  });

  const seasons: [PieceId, Mode, number[]][] = [
    ["basket", "classic", [1, 2, 8, 4, 7, 8, 5, 6]],
    ["summer", "classic", [5, 10, 7, 9, 13, 14, 15, 7, 10, 6, 7, 11, 12]],
    ["leaves", "thread", [5, 3, 3, 5, 8, 4, 7, 8, 5, 6]],
  ];
  it.each(seasons)("%s 有一条可玩的通关路线", (piece, mode, tiles) => {
    let round = makeRound(piece, mode);
    for (const tile of tiles) {
      expect(finished(round)).toBe(false);
      round = slide(round, tile);
    }
    expect(finished(round)).toBe(true);
    if (piece === "leaves") expect(round.frame.pins).toBe(2);
  });
});

describe("计时、布标与存档", () => {
  it("首次有效滑动开表，超时仍可通关，同一初局可刷新纪录", () => {
    const start = makeRound("kite", "timed");
    expect(move(start, 8, 500).started).toBeNull();
    const first = slide(start, 4, 1_000);
    expect(first.started).toBe(1_000);
    expect(undo(first).started).toBe(1_000);
    const slow = slide(slide(first, 5, 21_500), 8, 25_000);
    expect(finished(slow)).toBe(true);
    const save = emptySave();
    save.rounds[keyFor("kite", "timed")] = first;
    const recorded = finishRecord(save, slow, 25_000);
    expect(recorded.rounds).toEqual({});
    expect(recorded.records.kite).toEqual({ timed: 3, time: 24_000 });

    const retry = makeRound("kite", "timed");
    expect(retry).toEqual(start);
    const faster = slide(slide(slide(retry, 4, 30_000), 5, 40_000), 8, 48_420);
    const best = finishRecord(recorded, faster, 48_420);
    expect(clock(best.records.kite!.time!)).toBe("00:18.42");
    expect(finishRecord(best, slow, 25_000).records.kite).toEqual(
      best.records.kite,
    );
  });

  it("数织图案符合五行五列线索，空格可留白或打叉", () => {
    const rows = ["10101", "11111", "01110", "00100", "00100"].map((row) =>
      [...row].map(Number),
    );
    expect(rows.map(groups)).toEqual(ROWS);
    expect(rows[0].map((_, i) => groups(rows.map((row) => row[i])))).toEqual(
      COLS,
    );
    const cells = rows.flat();
    expect(solvedLabel(cells)).toBe(true);
    expect(solvedLabel(cells.map((cell) => cell || 2))).toBe(true);
    cells[1] = 1;
    expect(solvedLabel(cells)).toBe(false);
  });

  it("恢复局面时保留有效历史，隔离坏局面与错误的布标完成标记", () => {
    const save = emptySave();
    const valid = slide(makeRound("kite", "thread"), 2);
    save.rounds[keyFor("kite", "thread")] = valid;
    const corrupt = makeRound("sail", "classic");
    corrupt.frame.board[0] = 0;
    save.rounds[keyFor("sail", "classic")] = corrupt;
    save.loom.finished = true;
    save.loom.attached = true;
    const recovered = restore(JSON.parse(JSON.stringify(save)));
    expect(recovered.rounds).toEqual({ "kite/thread": valid });
    expect(undo(recovered.rounds["kite/thread"])).toEqual(
      makeRound("kite", "thread"),
    );
    expect(recovered.loom.finished).toBe(false);
    expect(recovered.loom.attached).toBe(false);
  });
});
