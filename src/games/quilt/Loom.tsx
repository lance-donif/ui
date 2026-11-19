import { useRef, useState, type KeyboardEvent } from "react";
import Badge from "./Badge";
import { COLS, ROWS, groups, solvedLabel, type Save } from "./rules";

type Props = {
  loom: Save["loom"];
  update: (next: Save["loom"]) => void;
  back: () => void;
  collect: () => void;
};
function clueMatches(line: number[], clue: number[]) {
  return groups(line).join(",") === clue.join(",");
}
export default function Loom({ loom, update, back, collect }: Props) {
  const [tool, setTool] = useState<1 | 2>(1);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  function edit(i: number) {
    if (loom.finished) return;
    const cells = loom.cells.slice();
    cells[i] = cells[i] === tool ? 0 : tool;
    update({
      ...loom,
      cells,
      history: [...loom.history, loom.cells],
      finished: solvedLabel(cells),
    });
  }
  function navigate(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const col = i % 5,
      row = Math.floor(i / 5);
    const dirs: Record<string, number> = {
      ArrowUp: row > 0 ? i - 5 : i,
      ArrowDown: row < 4 ? i + 5 : i,
      ArrowLeft: col > 0 ? i - 1 : i,
      ArrowRight: col < 4 ? i + 1 : i,
    };
    if (e.key in dirs) {
      e.preventDefault();
      refs.current[dirs[e.key]]?.focus();
    }
  }
  if (loom.finished)
    return (
      <section className="qw-inner qw-reward">
        <div className="qw-reward-art">
          <Badge />
        </div>
        <div>
          <p className="qw-eyebrow">风起时 · 布标完成</p>
          <h2>绣好了！</h2>
          <p>这枚郁金香可以缝在风筝作品的右下角。</p>
          <div className="qw-play-controls">
            <button
              className="qw-primary"
              onClick={() => {
                update({ ...loom, attached: true });
                collect();
              }}
            >
              装上布标
            </button>
            <button className="qw-secondary" onClick={back}>
              稍后
            </button>
          </div>
        </div>
      </section>
    );
  return (
    <section className="qw-inner qw-loom">
      <button className="qw-link" onClick={back}>
        ← 回到作品
      </button>
      <div className="qw-section-title">
        <div>
          <p className="qw-eyebrow">风起时 · 工坊布标</p>
          <h2>绣一朵郁金香</h2>
        </div>
      </div>
      <div className="qw-lab">
        <div className="qw-frame qw-loom-wrap">
          <div className="qw-crossword" aria-label="五行五列绣框">
            <span className="qw-needle-mark" aria-hidden="true">
              ✳
            </span>
            {COLS.map((clue, c) => (
              <span
                key={c}
                className={
                  "qw-clue " +
                  (clueMatches(
                    loom.cells.filter((_, i) => i % 5 === c),
                    clue,
                  )
                    ? "complete"
                    : "")
                }
                aria-label={"第" + (c + 1) + "列线索" + clue.join(" ")}
              >
                {clue.join(" ")}
              </span>
            ))}
            {ROWS.map((clue, r) => (
              <div className="qw-loom-row" key={r}>
                <span
                  className={
                    "qw-clue " +
                    (clueMatches(loom.cells.slice(r * 5, r * 5 + 5), clue)
                      ? "complete"
                      : "")
                  }
                >
                  {clue.join(" ")}
                </span>
                {loom.cells.slice(r * 5, r * 5 + 5).map((cell, c) => (
                  <button
                    key={c}
                    ref={(el) => {
                      refs.current[r * 5 + c] = el;
                    }}
                    onKeyDown={(e) => navigate(e, r * 5 + c)}
                    className={"qw-stitch c" + cell}
                    onClick={() => edit(r * 5 + c)}
                    aria-label={`第${r + 1}行第${c + 1}列，${["未标", "缝线", "标空"][cell]}`}
                    aria-pressed={cell === 1}
                  >
                    {cell === 2 ? "×" : ""}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
        <aside className="qw-note">
          <p className="qw-eyebrow">数织 · 5 × 5</p>
          <h3>读数落针</h3>
          <p>数字表示这一行或一列连续的针数。多段针脚之间，至少留出一格。</p>
          <div className="qw-segment" aria-label="选择工具">
            <button aria-pressed={tool === 1} onClick={() => setTool(1)}>
              缝线
            </button>
            <button aria-pressed={tool === 2} onClick={() => setTool(2)}>
              标空
            </button>
          </div>
          <p className="qw-hint">从线索为 5 的行开始。再次点同一格可拆线。</p>
          <button
            className="qw-secondary"
            disabled={!loom.history.length}
            onClick={() => {
              update({
                ...loom,
                cells: loom.history[loom.history.length - 1],
                history: loom.history.slice(0, -1),
              });
            }}
          >
            撤回一针
          </button>
          <p className="qw-hint">绣出正确花样后会自动收针。</p>
        </aside>
      </div>
    </section>
  );
}
