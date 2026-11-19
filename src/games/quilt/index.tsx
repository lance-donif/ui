import { useEffect, useRef, useState } from "react";
import { readGameSave, writeGameSave } from "../../shared/storage";
import Board from "./Board";
import Loom from "./Loom";
import Badge from "./Badge";
import {
  PIECES,
  activeTarget,
  recentWithFirst,
  clock,
  finishRecord,
  finished,
  getPiece,
  keyFor,
  makeRound,
  move,
  restore,
  undo,
  type Mode,
  type Piece,
  type PieceId,
  type Round,
  type Save,
} from "./rules";
import hero from "./assets/hero.webp";
import kite from "./assets/kite.webp";
import sail from "./assets/sail.webp";
import tulip from "./assets/tulip.webp";
import basket from "./assets/basket.webp";
import leaves from "./assets/leaves.webp";
import "./quilt.css";

const art = { kite, sail, tulip, basket, leaves };
type Section = "library" | "show" | "album";
type View = Section | "detail" | "work" | "board" | "result" | "loom";
const tabs: ReadonlyArray<[Section, string]> = [
  ["library", "图样册"],
  ["show", "四季布展"],
  ["album", "作品册"],
];
const modeName: Record<Mode, string> = {
  classic: "经典拼图",
  thread: "针路关",
  timed: "同局计时",
};
const pieceStory: Record<PieceId, string> = {
  kite: "顺着风筝的红线，把春风拼回蓝格布。",
  sail: "从帆尖到海浪，沿着船身的针脚把十五块布归位。",
  tulip: "找出花茎的相接处，再让三朵郁金香重回花园。",
  basket: "先接回提篮的弧线，再把春花收入篮中。",
  summer: "同一艘帆船，换一条更长的返航路线。",
  leaves: "沿秋叶的针脚穿过两枚针孔，让叶脉重新相接。",
};
function Patch({ small = false }: { small?: boolean }) {
  return (
    <span className={"qw-patch" + (small ? " tiny" : "")} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
function pieceArt(piece: Piece) {
  return art[piece.art];
}
export default function Quilt() {
  const [data, setData] = useState(() => restore(readGameSave<Save>("quilt")));
  const [initial] = useState(() => activeTarget(data));
  const initialRound = initial === "loom" ? null : initial;
  const [view, setView] = useState<View>(
      initial === "loom" ? "loom" : initialRound ? "board" : "library",
    ),
    [id, setId] = useState<PieceId>(initialRound?.piece ?? "kite"),
    [mode, setMode] = useState<Mode>(initialRound?.mode ?? "classic");
  const [source, setSource] = useState<Section>(
      initial === "loom"
        ? "album"
        : PIECES.slice(3).some((p) => p.id === id)
          ? "show"
          : "library",
    ),
    [message, setMessage] = useState(""),
    [confirm, setConfirm] = useState<"leave" | "restart" | "hall" | null>(null);
  const [outcome, setOutcome] = useState<{ round: Round; time: number } | null>(
    null,
  );
  const dialog = useRef<HTMLDialogElement>(null);
  const artViewer = useRef<HTMLDialogElement>(null);
  const stored = useRef(data);
  const piece = getPiece(id),
    key = keyFor(id, mode),
    round = data.rounds[key],
    entry = data.records[id];
  const made = PIECES.filter((p) => data.records[p.id]);
  const target = activeTarget(data);
  const saved = target === "loom" ? null : target;
  useEffect(() => {
    if (stored.current !== data) {
      stored.current = data;
      writeGameSave("quilt", data, !!activeTarget(data));
    }
  }, [data]);
  useEffect(() => {
    if (confirm && !dialog.current?.open) dialog.current?.showModal?.();
    if (!confirm) dialog.current?.close?.();
  }, [confirm]);
  function go(to: View) {
    setMessage("");
    setConfirm(null);
    setView(to);
    if (typeof window.scrollTo === "function" && window.scrollY > 0)
      window.scrollTo({ top: 0, behavior: "instant" });
  }
  function section(to: Section) {
    setSource(to);
    go(to);
  }
  function select(p: Piece, from: Section) {
    setId(p.id);
    setSource(from);
    go(from === "album" ? "work" : "detail");
  }
  function start(id: PieceId, mode: Mode, reset = false) {
    setId(id);
    setMode(mode);
    const key = keyFor(id, mode);
    setData((prev) => ({
      ...prev,
      recent: recentWithFirst(prev, key),
      rounds: {
        ...prev.rounds,
        [key]: (!reset && prev.rounds[key]) || makeRound(id, mode),
      },
    }));
    go("board");
  }
  function updateRound(r: Round) {
    setData((prev) => ({
      ...prev,
      recent: recentWithFirst(prev, key),
      rounds: { ...prev.rounds, [key]: r },
    }));
  }
  function openLoom() {
    setId("kite");
    setSource("album");
    setData((prev) => ({ ...prev, recent: recentWithFirst(prev, "loom") }));
    go("loom");
  }
  function continueAtelier() {
    if (saved) start(saved.piece, saved.mode);
    else if (target === "loom") {
      setId("kite");
      setSource("album");
      go("loom");
    } else start("kite", "classic");
  }
  function moveTile(cell: number) {
    if (!round) return;
    const now = Date.now(),
      next = move(round, cell, now);
    if (next === round) {
      setMessage("这块布与空格不相邻。");
      return;
    }
    if (finished(next)) {
      setOutcome({ round: next, time: now - (next.started ?? now) });
      setData((prev) => finishRecord(prev, next, now));
      go("result");
      return;
    }
    setMessage(next.frame.pins !== round.frame.pins ? "针孔已点亮。" : "");
    updateRound(next);
  }
  function leaveBoard() {
    if (mode === "timed" && round?.started !== null) {
      setConfirm("leave");
      return;
    }
    go("detail");
  }
  function exitTimed(toHall = false) {
    setData((prev) => {
      const rounds = { ...prev.rounds };
      delete rounds[key];
      return { ...prev, rounds };
    });
    go("detail");
    if (toHall) window.location.hash = "/";
  }
  function cards(pieces: readonly Piece[], from: Section) {
    return (
      <div className="qw-cards">
        {pieces.map((p) => {
          const completed = !!data.records[p.id],
            progress = Object.values(data.rounds).find((r) => r.piece === p.id);
          const locked = from === "album" && !completed;
          return (
            <button
              key={p.id}
              className={"qw-card" + (locked ? " qw-locked" : "")}
              onClick={() => select(p, from)}
              disabled={locked}
            >
              <span className="qw-card-image">
                <img
                  src={pieceArt(p)}
                  alt={p.title + "拼布图样"}
                  draggable={false}
                />
                {p.id === "kite" && completed && data.loom.attached && (
                  <Badge />
                )}
                {completed || progress || locked ? (
                  <span className="qw-status">
                    {completed ? "已完成" : locked ? "待完成" : "可继续"}
                  </span>
                ) : null}
              </span>
              <span className="qw-card-info">
                <span>
                  <small>
                    {p.season} · {p.size} × {p.size}
                  </small>
                  <strong>{p.title}</strong>
                </span>
                <span className="qw-round-arrow" aria-hidden="true">
                  ↗
                </span>
              </span>
            </button>
          );
        })}
      </div>
    );
  }
  const currentTab = tabs.some(([s]) => s === view) ? view : source;
  const workTitle = (
    <div className="qw-titlebar">
      <div className="qw-brand">
        <Patch />
        <span>拼布工坊</span>
      </div>
      <a
        href="#/"
        className="qw-home"
        onClick={(e) => {
          if (view === "board" && mode === "timed" && round?.started != null) {
            e.preventDefault();
            setConfirm("hall");
          }
        }}
      >
        ← 游戏大厅
      </a>
    </div>
  );
  const choices: Mode[] =
    piece.id === "leaves" ? ["thread"] : ["classic", "thread"];
  return (
    <main className="qw">
      <div className="qw-shell">
        {workTitle}
        {["library", "show", "album"].includes(view) && (
          <nav className="qw-tabs" aria-label="工坊导航">
            {tabs.map(([k, t]) => (
              <button
                key={k}
                aria-current={currentTab === k ? "page" : undefined}
                onClick={() => section(k)}
              >
                {t}
              </button>
            ))}
          </nav>
        )}
        {view === "library" && (
          <>
            <section
              className="qw-hero"
              style={{ backgroundImage: `url("${hero}")` }}
            >
              <div className="qw-hero-content">
                <p className="qw-eyebrow">经典滑块拼图</p>
                <h1>
                  拼一幅
                  <br />
                  春天的布画
                </h1>
                <p>滑动一块布，接起一段风筝线。</p>
                <button className="qw-primary" onClick={continueAtelier}>
                  {saved
                    ? "继续上次拼图"
                    : target === "loom"
                      ? "继续绣布标"
                      : "开始拼风筝"}{" "}
                  <span>→</span>
                </button>
              </div>
            </section>
            <section className="qw-inner">
              <div className="qw-section-title">
                <div>
                  <p className="qw-eyebrow">图样册</p>
                  <h2>挑一幅图样</h2>
                </div>
                <span className="qw-muted">3 幅</span>
              </div>
              {cards(PIECES.slice(0, 3), "library")}
            </section>
          </>
        )}
        {view === "show" && (
          <section className="qw-inner">
            <div className="qw-section-title">
              <div>
                <p className="qw-eyebrow">主题挑战</p>
                <h1>四季布展</h1>
                <p>从春日花篮到秋叶针路，为布展完成三幅作品。</p>
              </div>
            </div>
            {cards(PIECES.slice(3), "show")}
            <p className="qw-collection-count">
              已展出 {made.filter((p) => PIECES.indexOf(p) >= 3).length} / 3 幅
            </p>
          </section>
        )}
        {view === "album" && (
          <section className="qw-inner">
            <div className="qw-section-title">
              <div>
                <p className="qw-eyebrow">收藏与重玩</p>
                <h1>作品册</h1>
                <p>
                  {made.length
                    ? "查看完成的布画，或回到同一局挑战自己的用时。"
                    : "完成第一幅作品后，就能为它绣一枚专属布标。"}
                </p>
              </div>
              <span className="qw-muted">{made.length} / 6 幅</span>
            </div>
            {!made.length && (
              <button
                className="qw-primary qw-before-cards"
                onClick={() => start("kite", "classic")}
              >
                去拼第一幅 →
              </button>
            )}
            {cards(PIECES, "album")}
          </section>
        )}
        {view === "detail" && (
          <section className="qw-inner">
            <button className="qw-link" onClick={() => section(source)}>
              ← {source === "show" ? "四季布展" : "图样册"}
            </button>
            <div className="qw-details">
              <figure>
                <img src={pieceArt(piece)} alt={piece.title + "成品图样"} />
              </figure>
              <div>
                <p className="qw-eyebrow">
                  {piece.season} · {piece.size} × {piece.size}
                </p>
                <h1>{piece.title}</h1>
                <p>{pieceStory[id]}</p>
                <div className="qw-modes">
                  {choices.map((m) => (
                    <button
                      key={m}
                      className="qw-mode"
                      onClick={() => start(id, m)}
                    >
                      <strong>
                        {modeName[m]} <span>→</span>
                      </strong>
                      <small>
                        {data.rounds[keyFor(id, m)]
                          ? "继续已保存的棋盘"
                          : m === "thread"
                            ? "让空格先后经过 A、B，再拼回图案。"
                            : "滑动相邻的布片，还原完整作品。"}
                      </small>
                    </button>
                  ))}
                </div>
                {entry && (
                  <button className="qw-link" onClick={() => go("work")}>
                    查看完成作品 →
                  </button>
                )}
              </div>
            </div>
          </section>
        )}
        {view === "board" && round && (
          <Board
            key={key}
            round={round}
            art={pieceArt(piece)}
            onMove={moveTile}
            onUndo={() => {
              updateRound(undo(round));
              setMessage("已撤回一步。");
            }}
            leave={leaveBoard}
            notice={message}
          />
        )}
        {view === "board" && round && round.history.length > 0 && (
          <div className="qw-restart">
            <button className="qw-link" onClick={() => setConfirm("restart")}>
              重新开始本局
            </button>
          </div>
        )}
        {view === "result" && outcome && (
          <section className="qw-inner">
            <div className="qw-details qw-result">
              <figure>
                <img src={pieceArt(piece)} alt={piece.title + "已完成"} />
                {id === "kite" && data.loom.attached && <Badge />}
              </figure>
              <div>
                <p className="qw-eyebrow">已收入作品册 · {modeName[mode]}</p>
                <h1>
                  {mode === "timed"
                    ? outcome.time <= 20000
                      ? "达成目标"
                      : "挑战完成"
                    : "拼好了！"}
                </h1>
                <p>{piece.title}</p>
                <dl className="qw-stats">
                  <div>
                    <dt>本次步数</dt>
                    <dd>{outcome.round.history.length}</dd>
                  </div>
                  <div>
                    <dt>{mode === "timed" ? "本局用时" : "个人最佳"}</dt>
                    <dd>
                      {mode === "timed"
                        ? clock(outcome.time)
                        : entry?.[mode] + " 步"}
                    </dd>
                  </div>
                </dl>
                <button className="qw-primary" onClick={() => go("work")}>
                  查看作品 →
                </button>
                <button
                  className="qw-secondary"
                  onClick={() => start(id, mode, true)}
                >
                  重玩同一局
                </button>
                <button
                  className="qw-link"
                  onClick={() => {
                    const next = PIECES[PIECES.indexOf(piece) + 1];
                    if (next)
                      select(
                        next,
                        PIECES.indexOf(next) >= 3 ? "show" : "library",
                      );
                    else section("album");
                  }}
                >
                  {id === "leaves" ? "返回作品册" : "下一幅图样"} →
                </button>
              </div>
            </div>
          </section>
        )}
        {view === "work" && entry && (
          <section className="qw-inner">
            <button className="qw-link" onClick={() => section("album")}>
              ← 作品册
            </button>
            <div className="qw-details">
              <figure>
                <button
                  className="qw-zoom"
                  aria-label={"放大查看" + piece.title}
                  onClick={() => artViewer.current?.showModal()}
                >
                  <img src={pieceArt(piece)} alt={piece.title + "作品"} />
                  {id === "kite" && data.loom.attached && <Badge />}
                </button>
              </figure>
              <div>
                <p className="qw-eyebrow">{piece.season} · 成品</p>
                <h1>{piece.title}</h1>
                <div className="qw-stats">
                  <div>
                    <small>最佳步数</small>
                    <strong>
                      {Math.min(
                        ...[entry.classic, entry.thread, entry.timed].filter(
                          (x): x is number => typeof x === "number",
                        ),
                      )}{" "}
                      步
                    </strong>
                  </div>
                  {entry.time !== undefined && (
                    <div>
                      <small>最佳用时</small>
                      <strong>{clock(entry.time)}</strong>
                    </div>
                  )}
                </div>
                <button
                  className="qw-primary"
                  onClick={() => start(id, "timed", true)}
                >
                  计时挑战 · 20 秒 →
                </button>
                <button
                  className="qw-secondary"
                  onClick={() =>
                    start(id, id === "leaves" ? "thread" : "classic")
                  }
                >
                  自由重玩
                </button>
                {id === "kite" &&
                  (!data.loom.finished ? (
                    <button className="qw-mode" onClick={openLoom}>
                      <strong>
                        {data.loom.history.length ? "继续绣布标" : "制作布标"} →
                      </strong>
                      <small>用行列数字绣一朵 5 × 5 郁金香。</small>
                    </button>
                  ) : (
                    <button
                      className="qw-link"
                      onClick={() =>
                        setData((prev) => ({
                          ...prev,
                          loom: { ...prev.loom, attached: !prev.loom.attached },
                        }))
                      }
                    >
                      {data.loom.attached ? "取下" : "装上"}郁金香布标
                    </button>
                  ))}
              </div>
            </div>
          </section>
        )}
        {view === "loom" && (
          <Loom
            loom={data.loom}
            update={(loom) =>
              setData((prev) => ({
                ...prev,
                loom,
                recent: recentWithFirst(prev, "loom"),
              }))
            }
            back={() => go("work")}
            collect={() => go("work")}
          />
        )}
      </div>
      <dialog
        className="qw-dialog qw-art-viewer"
        ref={artViewer}
        aria-label={piece.title + "作品大图"}
      >
        <img src={pieceArt(piece)} alt={piece.title + "刺绣细节"} />
        {id === "kite" && data.loom.attached && <Badge />}
        <button
          className="qw-secondary"
          onClick={() => artViewer.current?.close()}
        >
          关闭大图
        </button>
      </dialog>
      <dialog
        className="qw-dialog"
        ref={dialog}
        onCancel={(e) => {
          e.preventDefault();
          setConfirm(null);
        }}
        aria-labelledby="qw-dialog-title"
      >
        <h3 id="qw-dialog-title">
          {confirm !== "restart" ? "结束这次计时？" : "重新开始本局？"}
        </h3>
        <p>
          {confirm !== "restart"
            ? "本次挑战的计时将结束。已收藏的作品会保留。"
            : "棋盘、步数和针孔会恢复至开局。"}
        </p>
        <div>
          <button
            className="qw-secondary"
            autoFocus
            onClick={() => setConfirm(null)}
          >
            继续拼图
          </button>
          <button
            className="qw-primary"
            onClick={() =>
              confirm !== "restart"
                ? exitTimed(confirm === "hall")
                : start(id, mode, true)
            }
          >
            {confirm !== "restart" ? "结束计时" : "重新开始"}
          </button>
        </div>
      </dialog>
    </main>
  );
}
