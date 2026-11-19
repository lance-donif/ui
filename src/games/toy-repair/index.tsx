import { useEffect, useRef, useState } from "react";
import { readGameSave, writeGameSave } from "../../shared/storage";
import Workbench, { asset } from "./Workbench";
import {
  advanced,
  choosePlan,
  completeAction,
  currentAction,
  deliver,
  diagnose,
  faultName,
  kinds,
  newJob,
  normalizeSave,
  observation,
  repairActions,
  retryRepair,
  toolNames,
  toys,
  type Fault,
  type Job,
  type Kind,
  type Phase,
  type Preference,
  type StudioSave,
  type Test,
  type Ticket,
  type Tool,
} from "./model";
import "./styles.css";
import "./mobile.css";

const phases: Record<Phase, string> = {
  inspect: "检查",
  tests: "测试",
  diagnose: "核对证据",
  choose: "比较修法",
  repair: "修补",
  trial: "试修",
  pass: "待交付",
  fail: "需要返工",
};
const testLabel = (kind: Kind, t: Test) =>
  kind === "music"
    ? t === "drive"
      ? "轻转钥匙"
      : "手转滚筒"
    : t === "drive"
      ? "迎风测试"
      : "轻拨叶片";
function procedureTitle(job: Job, route: "keep" | "swap") {
  if (job.kind === "music")
    return job.fault === 0
      ? route === "keep"
        ? "复位原齿轮"
        : "更换齿轮组件"
      : route === "keep"
        ? "校准原梳齿"
        : "更换梳齿组件";
  return job.fault === 0
    ? route === "keep"
      ? "调松原轴帽"
      : "更换轴帽组件"
    : route === "keep"
      ? "固定原叶片"
      : "更换叶片组件";
}
function repairFailure(job: Job) {
  if (job.kind === "bear")
    return "缝口末端仍然松动。回到收线，拉到定位圈的正中央。";
  if (job.kind === "car") return "后轮空转，小车停在起点。把齿轮重新对准轴销。";
  if (job.kind === "music")
    return job.fault === 0
      ? "滚筒没能自行转动。重新对准齿轮组件。"
      : "只听到了前两音。滑动梳齿座，校准最后一处间隙。";
  return job.fault === 0
    ? "轮轴仍然发涩。重新调好轴帽间隙再试风。"
    : "叶片绕着轴心空转。重新扣紧叶片座再试风。";
}
function successText(k: Kind) {
  return {
    bear: "轻拉右臂，缝口合拢，棉絮稳稳留在里面。",
    car: "后轮带动小车，前轮越过了终点线。",
    music: "滚筒自行转动，三个音完整响起。",
    wind: "松开风轮，四片叶片在风里持续旋转。",
  }[k];
}
function playFeedback(ctx: AudioContext, notes: number[]) {
  void ctx.resume().catch(() => {});
  notes.forEach((frequency, i) => {
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    const t = ctx.currentTime + i * 0.17;
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.065, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0003, t + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.32);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  });
}
type Tab = "counter" | "bench" | "book";
export default function ToyRepair() {
  const [save, setSave] = useState(() =>
    normalizeSave(readGameSave<StudioSave>("toy-repair")),
  );
  const [kind, setKind] = useState<Kind>(save.last);
  const [tab, setTab] = useState<Tab>(
    save.active[save.last] ? "bench" : "counter",
  );
  const [assist, setAssist] = useState(false);
  const [showStitchHint, setShowStitchHint] = useState(false);
  const [choosingOrder, setChoosingOrder] = useState(false);
  const [tool, setTool] = useState<Tool>("hand");
  const [message, setMessage] = useState("");
  const [pref, setPref] = useState<Preference>("keep");
  const [guess, setGuess] = useState<Fault | null>(null);
  const [proof, setProof] = useState<Test | null>(null);
  const [record, setRecord] = useState<Ticket | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const written = useRef<StudioSave | null>(null);
  const job = save.active[kind];
  const toy = toys[kind];
  const test = job?.testing ?? null;
  function setTest(value: Test | null) {
    if (job) changeJob({ ...job, testing: value, savedAngle: 0 });
  }
  useEffect(() => {
    if (written.current !== save) {
      writeGameSave("toy-repair", save, Object.keys(save.active).length > 0);
      written.current = save;
    }
  }, [save]);
  useEffect(
    () => () => {
      if (audio.current) void audio.current.close().catch(() => {});
    },
    [],
  );
  function sound(notes: number[]) {
    if (!save.sound) return;
    try {
      audio.current ??= new AudioContext();
      playFeedback(audio.current, notes);
    } catch {
      /* Visual feedback is always available. */
    }
  }
  function changeJob(next: Job) {
    setSave((s) => ({
      ...s,
      last: next.kind,
      active: { ...s.active, [next.kind]: next },
    }));
  }
  function resetUI() {
    setMessage("");
    setProof(null);
    setGuess(null);
    setTool("hand");
    setRecord(null);
  }
  function open(k: Kind) {
    resetUI();
    setKind(k);
    setTab("bench");
    const existing = save.active[k];
    if (!existing)
      changeJob(newJob(k, Math.random() < 0.5 ? 0 : 1, pref, Date.now()));
    else setSave((s) => ({ ...s, last: k }));
  }
  function nav(next: Tab) {
    resetUI();
    if (next === "bench" && !job) {
      const active = kinds.find((k) => save.active[k]);
      if (active) setKind(active);
    }
    setTab(next);
  }
  function takeAction(accurate: boolean) {
    if (!job) return;
    const before = currentAction(job, test);
    const next = completeAction(job, accurate, test);
    changeJob(next);
    if (job.phase === "tests" && test) {
      setMessage(observation(job, test));
      setProof(test);
      if (kind === "music" && test === "direct" && job.fault === 0)
        sound([523, 659]);
      return;
    }
    if (next.phase === "pass") {
      setMessage(successText(kind));
      sound(kind === "music" ? [523, 659, 784] : [587, 784]);
    } else if (next.phase === "fail") {
      setMessage(repairFailure(next));
      if (kind === "music" && next.fault === 1) sound([523, 659]);
    } else {
      const completion =
        before?.id === "inspect-arm"
          ? "找到裂口了。先把露出的棉絮收好。"
          : before?.id === "inspect-car"
            ? "钥匙转动了，后轮停在原处。翻到底盘，卸下螺钉。"
            : before?.id === "mesh"
              ? job.weak === null
                ? "两个齿轮已经咬合。"
                : "转动有些迟滞，试跑时再检查。"
              : !accurate && before?.precision
                ? "已经放下。试修时留意刚才的位置。"
                : next.phase === "trial"
                  ? "修补完成。用顾客描述的动作试一试。"
                  : "这一步已保存。";
      setMessage(completion);
      sound([next.repeat > 0 ? 587 : 659]);
    }
  }
  function submitDiagnosis() {
    if (!job || !proof || guess === null) return;
    const r = diagnose(job, proof, guess);
    changeJob(r.job);
    setMessage(r.message);
    setGuess(null);
    if (r.job.phase === "choose") sound([523, 659]);
  }
  function handOver() {
    if (!job || job.phase !== "pass") return;
    const now = Date.now();
    setRecord({ ...job, delivered: now });
    setSave((s) => deliver(s, kind, now));
    setTab("book");
    setMessage("玩具已经交还，案例已收入手册。");
    sound([523, 659, 784]);
  }
  const action = job ? currentAction(job, test) : null;
  function renderCounter() {
    const active = save.active[kind];
    const complete = save.history.some((h) => h.kind === kind);
    return (
      <div className="tr-counter-view" data-browsing={choosingOrder}>
        <button className="tr-mobile tr-order-strip" type="button" aria-label={choosingOrder ? "返回当前委托" : "切换委托"}
          aria-expanded={choosingOrder} aria-controls="tr-order-list" onClick={() => setChoosingOrder(!choosingOrder)}>
          <span aria-hidden="true">‹</span>{choosingOrder ? "选择委托" : `#${toy.id} ${toy.name}`}
        </button>
        <section className="tr-counter-hero" aria-label="委托详情">
          <div className="tr-counter-paper">
            <span className="tr-kicker">
              <i />
              客户委托　/　{toy.id}
            </span>
            <h1>{toy.name}</h1>
            <blockquote>“{toy.quote}”</blockquote>
            <p className="tr-sign">—　{toy.customer}</p>
            <details key={kind} className="tr-mobile tr-order-note">
              <summary className="tr-symptom">{{ bear: "右臂开线", car: "上弦后停在原地", music: "上弦后没有音乐", wind: "送风后叶片不转" }[kind]}</summary>
              <p>{toy.customer}说：“{toy.quote}”</p>
            </details>
            {advanced(kind) && !active && (
              <div className="tr-preference" aria-label="顾客偏好">
                <button
                  aria-pressed={pref === "keep"}
                  onClick={() => setPref("keep")}
                >
                  保留原件
                </button>
                <button
                  aria-pressed={pref === "quick"}
                  onClick={() => setPref("quick")}
                >
                  尽快修好
                </button>
              </div>
            )}
            <button className="tr-primary" onClick={() => open(kind)}>
              {active ? "继续维修" : complete ? "再接一单" : "接单并进入维修室"}{" "}
              <span>→</span>
            </button>
          </div>
          <div className="tr-counter-stage" data-toy={kind}>
            <img
              className="tr-featured-toy"
              key={kind}
              src={asset(kind)}
              alt={toy.name}
            />
            {kind === "bear" && <img className="tr-mobile tr-counter-loupe" src={asset("bear-loupe")} alt="右臂缝口与露出的棉絮" />}
            <span className="tr-desk-label">
              {active ? phases[active.phase] : "待维修"} · #{toy.id}
            </span>
          </div>
        </section>
        <div className="tr-section-title">
          <h2>委托柜台</h2>
          <span>{kinds.length} 件玩具</span>
        </div>
        <div className="tr-orders" id="tr-order-list">
          {kinds.map((k) => (
            <button
              className={"tr-order " + (k === kind ? "tr-current" : "")}
              key={k}
              aria-pressed={k === kind}
              onClick={() => {
                setKind(k);
                setMessage("");
                setChoosingOrder(false);
              }}
            >
              <span
                className="tr-order-art"
                style={{ background: toys[k].color + "29" }}
              >
                <img src={asset(k)} alt="" />
              </span>
              <span>
                <small>
                  #{toys[k].id} · {save.active[k] ? "维修中" : toys[k].chapter}
                </small>
                <b>{toys[k].name}</b>
              </span>
              <em>›</em>
            </button>
          ))}
        </div>
      </div>
    );
  }
  function renderBook() {
    if (record)
      return (
        <div className="tr-record-detail">
          <div className="tr-record-art">
            <img
              src={asset(record.kind === "bear" ? "bear-done" : record.kind)}
              alt="已修好的玩具"
            />
          </div>
          <article>
            <button
              className="tr-backlink"
              onClick={() => {
                setRecord(null);
                setMessage("");
              }}
            >
              ← 全部记录
            </button>
            <p className="tr-kicker">已交付　/　#{toys[record.kind].id}</p>
            <h1>{toys[record.kind].name}</h1>
            <p className="tr-notebook-quote">“{toys[record.kind].quote}”</p>
            <dl>
              <dt>故障</dt>
              <dd>{faultName(record)}</dd>
              <dt>修法</dt>
              <dd>
                {advanced(record.kind)
                  ? procedureTitle(record, record.route)
                  : record.kind === "bear"
                    ? "收棉、交替穿针、收线"
                    : "拆盖、齿轮复位、装盖"}
              </dd>
              {advanced(record.kind) && (
                <>
                  <dt>顾客偏好</dt>
                  <dd>
                    {record.preference === "keep" ? "保留原件" : "尽快修好"} ·{" "}
                    {(
                      record.preference === "keep"
                        ? record.spent === 0
                        : record.operations <= 2
                    )
                      ? "已达成"
                      : "已修复"}
                  </dd>
                  <dt>耗用</dt>
                  <dd>
                    {record.spent} 份备件 ·{" "}
                    {record.operations || repairActions(record).length} 道工序
                  </dd>
                </>
              )}
              <dt>试修</dt>
              <dd>{successText(record.kind)}</dd>
            </dl>
            <button
              className="tr-primary"
              onClick={() => {
                setKind(record.kind);
                nav("counter");
              }}
            >
              回到柜台 →
            </button>
          </article>
        </div>
      );
    return (
      <section className="tr-book">
        <div className="tr-section-title">
          <h1>维修手册</h1>
          <span>{save.history.length} 笔已交付委托</span>
        </div>
        {save.history.length ? (
          <div className="tr-records">
            {save.history.map((h) => (
              <button key={h.serial} onClick={() => setRecord(h)}>
                <img
                  alt=""
                  src={asset(h.kind === "bear" ? "bear-done" : h.kind)}
                />
                <span>
                  <small>#{toys[h.kind].id} · 已交付</small>
                  <b>{toys[h.kind].name}</b>
                  <em>{faultName(h)}</em>
                  <span className="tr-mobile tr-approved">试修通过</span>
                </span>
                <strong>›</strong>
              </button>
            ))}
          </div>
        ) : (
          <div className="tr-empty">
            <img src={asset("needle")} alt="" />
            <h2>手册的第一页还空着</h2>
            <p>交还第一件修好的玩具，就能在这里翻看它的维修记录。</p>
            <button className="tr-primary" onClick={() => nav("counter")}>
              去柜台接单 →
            </button>
          </div>
        )}
      </section>
    );
  }
  function renderBench() {
    if (!job)
      return (
        <section className="tr-empty">
          <img src={asset("driver")} alt="" />
          <h2>工作台准备好了</h2>
          <p>从柜台选一笔委托，或继续其他玩具的维修。</p>
          {kinds
            .filter((k) => save.active[k])
            .map((k) => (
              <button className="tr-secondary" key={k} onClick={() => open(k)}>
                继续维修{toys[k].name}
              </button>
            ))}
          <button className="tr-primary" onClick={() => nav("counter")}>
            回到柜台 →
          </button>
        </section>
      );
    const boardKey = [job.serial, job.phase, job.step, job.repeat, test].join(
      "-",
    );
    const stitching = kind === "bear" && action?.id === "stitch";
    const showingDelivery = job.phase === "pass" && (kind === "bear" || kind === "car");
    const status =
      job.phase === "pass"
        ? "试修通过"
        : job.phase === "fail"
          ? "试修需要调整"
          : (action?.title ??
            {
              tests: "选择一项测试",
              diagnose: "核对证据",
              choose: "为顾客选一种修法",
            }[job.phase as "tests" | "diagnose" | "choose"] ??
            "维修台");
    return (
      <>
        <div className="tr-bench-top">
          <div>
            <span className="tr-kicker">维修室　/　#{toy.id}</span>
            <h1>
              <span className="tr-mobile">{showingDelivery ? "交还玩具" : "#" + toy.id + " "}</span>
              <span className={showingDelivery ? "tr-delivered-name" : undefined}>{toy.name}</span>
            </h1>
          </div>
          <button className="tr-backlink" onClick={() => nav("counter")}>
            ← 回到柜台
          </button>
        </div>
        <div className="tr-bench-layout" data-toy={kind} data-phase={job.phase} data-operating={Boolean(action)} data-stitching={stitching} data-stitch-hint={showStitchHint}>
          <Workbench
            key={boardKey}
            job={job}
            tool={tool}
            test={test}
            onTool={setTool}
            assist={assist}
            onAssist={setAssist}
            onComplete={takeAction}
            onProgress={(deg) => changeJob({ ...job, savedAngle: deg })}
            onMessage={setMessage}
          />
          {showingDelivery && (
            <div className="tr-mobile tr-delivery-art">
              <strong>#{toy.id} {toy.name}</strong>
              <img src={asset(kind === "bear" ? "bear-done" : "car-delivery")} alt={kind === "bear" ? "修好的小熊玩偶" : "双手捧起修好的发条小车"} />
            </div>
          )}
          <section className="tr-taskcard">
            <div className="tr-phase">
              <i />
              {phases[job.phase]}
              {action?.repeats
                ? " · " + (job.repeat + 1) + " / " + action.repeats
                : ""}
            </div>
            <h2 aria-label={stitching ? status : undefined}>{stitching ? (
              <>
                <span className="tr-sewing-label">{status}</span>
                <button type="button" className="tr-mobile tr-sewing-help" aria-label={status + "的操作说明"} aria-expanded={showStitchHint} aria-controls="tr-stitch-hint" onClick={() => setShowStitchHint(!showStitchHint)}>
                  <span aria-hidden="true">?</span>{status}
                </button>
              </>
            ) : status}</h2>
            {action && (
              <>
                <p id={stitching ? "tr-stitch-hint" : undefined}>{action.hint}</p>
                <div className="tr-needed">
                  <img src={asset(action.tool)} alt="" />
                  本步工具 <b>{toolNames[action.tool]}</b>
                </div>
                {action.id === "stitch" && job.repeat > 0 && (
                  <button
                    className="tr-backlink"
                    onClick={() => {
                      changeJob({ ...job, repeat: job.repeat - 1 });
                      setMessage("已拆下最后一针。");
                    }}
                  >
                    ↶ 退回一针
                  </button>
                )}
                {job.phase === "tests" && (
                  <button
                    className="tr-backlink"
                    onClick={() => {
                      setTest(null);
                    }}
                  >
                    换一项测试
                  </button>
                )}
              </>
            )}
            {job.phase === "tests" && !test && (
              <>
                <p>“{toy.quote}”</p>
                <div className="tr-choice-list">
                  {(["drive", "direct"] as Test[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setTest(t);
                        setMessage("");
                      }}
                    >
                      {testLabel(kind, t)}
                      <span>{job.evidence.includes(t) ? "再测" : "→"}</span>
                    </button>
                  ))}
                </div>
                {job.evidence.length > 0 && (
                  <button
                    className="tr-primary"
                    onClick={() => {
                      setProof(job.evidenceUse ?? job.evidence[0]);
                      setGuess(null);
                      setMessage("");
                      changeJob({ ...job, phase: "diagnose" });
                    }}
                  >
                    打开证据 · 核对假设 →
                  </button>
                )}
              </>
            )}
            {job.phase === "diagnose" && (
              <>
                <h3>选一条实测证据</h3>
                <div className="tr-choice-list">
                  {job.evidence.map((t) => (
                    <button
                      aria-pressed={proof === t}
                      key={t}
                      onClick={() => setProof(t)}
                    >
                      {observation(job, t)}
                    </button>
                  ))}
                </div>
                <h3>哪种故障与它吻合？</h3>
                <div className="tr-choice-list">
                  {([0, 1] as Fault[]).map((f) => (
                    <button
                      key={f}
                      aria-pressed={guess === f}
                      onClick={() => setGuess(f)}
                    >
                      {faultName(job, f)}
                    </button>
                  ))}
                </div>
                <button
                  className="tr-primary"
                  disabled={guess === null || !proof}
                  onClick={submitDiagnosis}
                >
                  核对判断 →
                </button>
                <button
                  className="tr-backlink"
                  onClick={() => {
                    changeJob({
                      ...job,
                      phase: "tests",
                      testing: null,
                      savedAngle: 0,
                    });
                    setMessage("");
                  }}
                >
                  再做一次测试
                </button>
              </>
            )}
            {job.phase === "choose" && (
              <>
                <p>
                  顾客希望{job.preference === "keep" ? "保留原件" : "尽快修好"}
                  。工作台上有一份备件。
                </p>
                <div className="tr-choice-list">
                  {(["keep", "swap"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        changeJob(choosePlan(job, r));
                        setMessage("");
                      }}
                    >
                      <span>
                        <b>{procedureTitle(job, r)}</b>
                        <small>
                          {r === "keep"
                            ? "保留旧件 · 3 道工序"
                            : "使用 1 份备件 · 2 道工序"}
                        </small>
                      </span>
                      →
                    </button>
                  ))}
                </div>
              </>
            )}
            {job.phase === "pass" && (
              <>
                <p>{successText(kind)}</p>
                <button className="tr-primary" onClick={handOver}>
                  交还玩具 →
                </button>
              </>
            )}
            {job.phase === "fail" && (
              <>
                <p>{repairFailure(job)}</p>
                <button
                  className="tr-primary"
                  onClick={() => {
                    changeJob(retryRepair(job));
                    setMessage("已回到需要调整的工序。");
                  }}
                >
                  回到故障部位 →
                </button>
              </>
            )}
            <div className="tr-feedback" role="status" aria-live="polite">
              {job.phase === "pass" || job.phase === "fail" ? "" : message}
            </div>
          </section>
        </div>
      </>
    );
  }
  return (
    <main className="tr-game">
      <header className="tr-mast">
        <a className="tr-home" href="#/" aria-label="返回游戏大厅">
          ← 大厅
        </a>
        <span className="tr-wordmark">
          <img src={asset("gear")} alt="" />
          玩具修理所
        </span>
        <button
          className="tr-sound"
          aria-pressed={save.sound}
          onClick={() => setSave((s) => ({ ...s, sound: !s.sound }))}
        >
          {save.sound ? "声音开" : "声音关"}
        </button>
      </header>
      <div className="tr-wrap">
        {tab !== "bench" && (
          <nav className="tr-tabs" aria-label="修理所">
            {(["counter", "bench", "book"] as Tab[]).map((t, i) => (
              <button
                key={t}
                aria-current={tab === t ? "page" : undefined}
                onClick={() => nav(t)}
              >
                {["委托柜台", "维修室", "维修手册"][i]}
              </button>
            ))}
          </nav>
        )}
        {tab === "counter"
          ? renderCounter()
          : tab === "bench"
            ? renderBench()
            : renderBook()}
      </div>
    </main>
  );
}
