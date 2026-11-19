import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  adjacent,
  aligned,
  clock,
  getPiece,
  isThread,
  pinsFor,
  type Round,
} from "./rules";

type Props = {
  round: Round;
  art: string;
  onMove: (i: number) => void;
  onUndo: () => void;
  leave: () => void;
  notice: string;
};
export default function Board({
  round,
  art,
  onMove,
  onUndo,
  leave,
  notice,
}: Props) {
  const [preview, setPreview] = useState(false);
  const [time, setTime] = useState(Date.now);
  const [fault, setFault] = useState<number | null>(null);
  const drag = useRef<{ i: number; x: number; y: number } | null>(null);
  const suppress = useRef(false);
  const piece = getPiece(round.piece),
    n = piece.size,
    thread = isThread(round),
    timed = round.mode === "timed";
  const { board, pins } = round.frame,
    hole = board.indexOf(0),
    holes = pinsFor(piece.id);
  useEffect(() => {
    if (!timed || round.started === null) return;
    const id = window.setInterval(() => setTime(Date.now()), 69);
    return () => clearInterval(id);
  }, [timed, round.started]);
  useEffect(() => {
    if (fault === null) return;
    const id = setTimeout(() => setFault(null), 550);
    return () => clearTimeout(id);
  }, [fault]);
  useEffect(() => {
    if (!preview) return;
    const end = () => setPreview(false);
    window.addEventListener("blur", end);
    window.addEventListener("pointerup", end);
    window.addEventListener("keyup", end);
    return () => {
      window.removeEventListener("blur", end);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("keyup", end);
    };
  }, [preview]);
  function choose(i: number) {
    if (preview) return;
    if (!adjacent(i, hole, n)) setFault(i);
    onMove(i);
  }
  function pointerUp(e: PointerEvent<HTMLButtonElement>) {
    const start = drag.current;
    drag.current = null;
    if (!start) return;
    const dx = e.clientX - start.x,
      dy = e.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) return;
    suppress.current = true;
    const direction =
      Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? -1 : 1) : dy < 0 ? -n : n;
    if (start.i + direction === hole) choose(start.i);
    else setFault(start.i);
  }
  function arrows(e: KeyboardEvent) {
    const offsets: Record<string, number> = {
      ArrowLeft: 1,
      ArrowRight: -1,
      ArrowUp: n,
      ArrowDown: -n,
    };
    if (!(e.key in offsets)) return;
    e.preventDefault();
    const i = hole + offsets[e.key];
    if (i >= 0 && i < board.length && adjacent(i, hole, n)) choose(i);
  }
  const first =
    round.piece === "kite" && round.mode === "classic" && !round.history.length;
  return (
    <section className="qw-inner qw-play">
      <div className="qw-crumb">
        <button onClick={leave} className="qw-link">
          ← 收起绷框
        </button>
        <span>{timed ? "同局计时" : thread ? "针路关" : "经典拼图"}</span>
      </div>
      <div className="qw-section-title">
        <div>
          <p className="qw-eyebrow">
            {piece.season} · {n} × {n}
          </p>
          <h2>{piece.title}</h2>
        </div>
        <span className="qw-metric">
          <b>{round.history.length}</b> 步
        </span>
      </div>
      <div className="qw-lab">
        <div className="qw-frame">
          <div
            className="qw-puzzle"
            role="group"
            tabIndex={0}
            aria-label={piece.title + "拼图，方向键可朝对应方向移动布片"}
            onKeyDown={arrows}
            style={{ "--qw-size": n } as CSSProperties}
          >
            {board
              .filter(Boolean)
              .sort((a, b) => a - b)
              .map((tile) => {
                const pos = board.indexOf(tile),
                  r = Math.floor(pos / n),
                  c = pos % n,
                  sy = Math.floor((tile - 1) / n),
                  sx = (tile - 1) % n;
                return (
                  <button
                    key={tile}
                    aria-label={`布块 ${tile}，第 ${r + 1} 行第 ${c + 1} 列`}
                    tabIndex={preview ? -1 : 0}
                    className={
                      "qw-tile" +
                      (fault === pos ? " qw-bad" : "") +
                      (first && tile === 4 ? " qw-guide-tile" : "")
                    }
                    style={
                      {
                        transform: `translate(${100 * c}%,${100 * r}%)`,
                        "--qw-art": `url("${art}")`,
                        "--qw-pos": `${(100 * sx) / (n - 1)}% ${(100 * sy) / (n - 1)}%`,
                      } as CSSProperties
                    }
                    onPointerDown={(e) => {
                      suppress.current = false;
                      drag.current = { i: pos, x: e.clientX, y: e.clientY };
                      e.currentTarget.setPointerCapture?.(e.pointerId);
                    }}
                    onPointerCancel={() => {
                      drag.current = null;
                      suppress.current = false;
                    }}
                    onPointerUp={pointerUp}
                    onClick={() => {
                      if (suppress.current) {
                        suppress.current = false;
                        return;
                      }
                      choose(pos);
                    }}
                  >
                    <span className="qw-tile-face">
                      <b>{tile}</b>
                      {first && tile === 4 && <i>←</i>}
                    </span>
                  </button>
                );
              })}
            <div
              aria-hidden="true"
              className="qw-empty"
              style={{
                left: ((hole % n) * 100) / n + "%",
                top: (Math.floor(hole / n) * 100) / n + "%",
              }}
            >
              <span>＋</span>
            </div>
            {thread &&
              holes.map((cell, j) => (
                <span
                  key={cell}
                  aria-hidden="true"
                  className={"qw-pin " + (pins > j ? "hit" : "")}
                  style={{
                    left: (((cell % n) + 0.77) * 100) / n + "%",
                    top: ((Math.floor(cell / n) + 0.22) * 100) / n + "%",
                  }}
                >
                  {j ? "B" : "A"}
                  {pins > j ? "✓" : ""}
                </span>
              ))}
            {preview && (
              <img
                className="qw-preview"
                alt={piece.title + "完整图样"}
                src={art}
              />
            )}
          </div>
        </div>
        <aside className="qw-note">
          <p className="qw-eyebrow">
            {timed ? "20 秒目标" : thread ? "依序穿针" : "滑块拼图"}
          </p>
          <h3>
            {timed
              ? "同局计时"
              : thread
                ? pins === 2
                  ? "针路已缝合"
                  : "下一针 · " + (pins ? "B" : "A")
                : first
                  ? "滑动第一块"
                  : "拼回布画"}
          </h3>
          <p>
            {timed
              ? "第一次有效移动开始计时。超出目标，仍可把作品拼完。"
              : thread
                ? "让空格依次经过 A、B 两枚针孔，再把每一块布归位。"
                : first
                  ? "把中间的 4 号布块向左滑入空格。"
                  : "将与空格共边的布块滑入空位，沿图案接回针脚。"}
          </p>
          {timed && (
            <strong className="qw-timer" aria-label="本局用时">
              {clock(round.started === null ? 0 : time - round.started)}
            </strong>
          )}
          {thread && (
            <div className="qw-thread-progress" aria-label={`已穿 ${pins} / 2`}>
              {["A", "B"].map((p, i) => (
                <span key={p} className={pins > i ? "hit" : ""}>
                  {p} {pins > i ? "已穿" : "待穿"}
                </span>
              ))}
            </div>
          )}
          <div className="qw-play-controls">
            <button
              className="qw-secondary"
              onPointerDown={(e) => {
                setPreview(true);
                e.currentTarget.setPointerCapture?.(e.pointerId);
              }}
              onPointerCancel={() => setPreview(false)}
              onPointerUp={() => setPreview(false)}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  setPreview(true);
                }
              }}
              onKeyUp={() => setPreview(false)}
              onBlur={() => setPreview(false)}
            >
              按住看原图
            </button>
            <button
              className="qw-secondary"
              onClick={onUndo}
              disabled={!round.history.length}
            >
              ↶ 撤回一步
            </button>
          </div>
          <p className="qw-hint">轻点或滑动布块，也可在棋盘按方向键。</p>
          <p role="status" className="qw-feedback">
            {fault !== null
              ? "只能向相邻空格移动。"
              : thread && aligned(round) && pins < 2
                ? "图样已拼好，还要依次点亮针孔。"
                : notice}
          </p>
        </aside>
      </div>
    </section>
  );
}
