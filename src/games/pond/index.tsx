import { useEffect, useState } from 'react';
import { playCue } from '../../shared/audio';
import { readGameSave, writeGameSave } from '../../shared/storage';
import { art, scenery } from './art';
import Board from './Board';
import { PondDialog } from './Dialog';
import { levels, regions, replay, jump, outcome, restoreSave, unlocked, type Level, type PondSave, type Region } from './game';
import './pond.css';

type Page = 'ponds' | 'levels' | 'favorites' | 'me' | 'play';
type Overlay = 'pause' | 'restart' | null;
type State = {
  book: PondSave;
  page: Page;
  region: Region;
  level: Level;
  moves: number[];
  overlay: Overlay;
};

function labelFor(id: Region) { return regions.find(region => region.id === id)!.name; }
function numberOf(level: Level) {
  return String(levels.filter(l => l.region === level.region).indexOf(level) + 1).padStart(2, '0');
}
function startState(): State {
  const book = restoreSave(readGameSave<PondSave>('pond'));
  const resume = levels.find(l => l.id === book.recent);
  return { book, page: resume ? 'play' : 'ponds', region: resume?.region ?? 'dawn',
    level: resume ?? levels[0], moves: resume ? book.runs[resume.id] : [], overlay: null };
}

const nav = [
  { page: 'levels', label: '关卡', img: art.flag },
  { page: 'ponds', label: '池塘', img: art.leaf },
  { page: 'favorites', label: '收藏', img: art.lotus },
  { page: 'me', label: '我的', img: art.frog },
] as const;

export default function PondGame() {
  const [state, set] = useState<State>(startState);
  const [notice, setNotice] = useState('');
  const [removed, setRemoved] = useState<string | null>(null);
  const { book, page, region, level, moves, overlay } = state;
  const position = replay(level, moves);
  const result = page === 'play' ? outcome(level, position) : 'playing';
  const regionLevels = levels.filter(l => l.region === region);
  const recent = levels.find(l => l.id === book.recent && book.runs[l.id]);
  const suggested = recent ?? levels.find(l => unlocked(l, book.records) && !book.records[l.id]) ?? levels[0];

  useEffect(() => {
    const hasProgress = !!book.recent;
    writeGameSave('pond', book, hasProgress);
  }, [book]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => { setNotice(''); setRemoved(null); }, 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function tell(text: string) { setNotice(text); setRemoved(null); }
  function browse(next: Page, nextRegion = region) {
    tell(''); set(s => ({ ...s, page: next, region: nextRegion, overlay: null }));
  }
  function start(target: Level, fresh = false) {
    if (!unlocked(target, book.records)) { tell('通过上一关后解锁。'); return; }
    tell('');
    set(s => {
      const attempt = fresh ? [] : s.book.runs[target.id] ?? [];
      return { ...s, page: 'play', level: target, region: target.region, moves: attempt, overlay: null,
        book: { ...s.book, recent: target.id, runs: { ...s.book.runs, [target.id]: attempt } } };
    });
  }
  function move(cell: number) {
    const next = jump(level, position, cell);
    if (next === position || page !== 'play' || overlay || result !== 'playing') return;
    const landing = outcome(level, next);
    if (landing === 'win') playCue('finish');
    else if (landing !== 'playing') playCue('fail');
    else if (next.key !== position.key) playCue('unlock');
    else if (next.flower !== position.flower) playCue('flower');
    else if (next.sunk.length > position.sunk.length) playCue('crack');
    else playCue('hop');
    if (next.key !== position.key) tell('拿到钥匙，旗点的木闸打开了。');
    else if (next.flower !== position.flower) tell('带上莲花到旗点，就能收下花章。');
    else if (level.cracks?.includes(cell)) tell('跳离这片裂叶后，它会沉入水中。');
    else tell('');
    set(s => {
      const before = replay(s.level, s.moves);
      const after = jump(s.level, before, cell);
      if (s.page !== 'play' || s.overlay || before === after) return s;
      const history = [...s.moves, cell];
      const runs = { ...s.book.runs, [s.level.id]: history };
      if (outcome(s.level, after) !== 'win') {
        return { ...s, moves: history, book: { ...s.book, recent: s.level.id, runs } };
      }
      delete runs[s.level.id];
      const last = s.book.records[s.level.id];
      const record = { best: Math.min(last?.best ?? Infinity, history.length), flower: after.flower || !!last?.flower };
      return { ...s, moves: history, book: { ...s.book, records: { ...s.book.records, [s.level.id]: record },
        recent: Object.keys(runs).at(-1) ?? null, runs } };
    });
  }
  function undo() {
    if (!moves.length) return;
    playCue('undo');
    tell('');
    set(s => {
      if (!s.moves.length) return s;
      const history = s.moves.slice(0, -1);
      return { ...s, moves: history, overlay: null, book: { ...s.book, recent: s.level.id, runs: { ...s.book.runs, [s.level.id]: history } } };
    });
  }
  function favorite(id: string) {
    const had = book.favorites.includes(id);
    set(s => ({ ...s, book: { ...s.book, favorites: s.book.favorites.includes(id)
      ? s.book.favorites.filter(v => v !== id) : [...s.book.favorites, id] } }));
    setRemoved(had ? id : null);
    setNotice(had ? '已取消收藏' : '已收藏这一关');
  }
  function showOverlay(value: Overlay) { tell(''); set(s => ({ ...s, overlay: value })); }
  function pause() { if (result === 'playing') showOverlay('pause'); }

  function levelRow(target: Level, index: number, favoriteList = false) {
    const open = unlocked(target, book.records);
    const record = book.records[target.id];
    const inProgress = !!book.runs[target.id]?.length;
    return <div className={'pond-row' + (!open ? ' locked' : '')} key={target.id}>
      <button className="pond-row-main" aria-label={open ? (inProgress ? '继续' : '进入') + target.name : target.name + '，未解锁'}
        onClick={() => open ? start(target, favoriteList) : tell('先通过「' + regionLevels[index - 1]?.name + '」。')}>
        <span className="pond-number">{numberOf(target)}</span>
        <span className="pond-row-name"><strong>{target.name}</strong><small>{favoriteList ? labelFor(target.region) + ' · ' : ''}{target.limit} 步
          {record ? ' · 最佳 ' + record.best + ' 步' : ''}{record?.flower ? ' · 已获花章' : ''}</small></span>
        <span className={'pond-row-status' + (open ? ' is-open' : '')}>{!open ? '未解锁' : inProgress && !favoriteList ? '继续' : record ? '重玩' : '挑战'}{open && ' ›'}</span>
      </button>
      {favoriteList && <button className="pond-heart" aria-label={'取消收藏' + target.name} onClick={() => favorite(target.id)}>★</button>}
    </div>;
  }
  const playing = page === 'play';
  const nextLevel = regionLevels[regionLevels.indexOf(level) + 1];
  const lastRecord = book.records[level.id];
  const failureMessage = result === 'empty' ? '小旗还在前方，试试另一条路线。'
    : level.key !== undefined && !position.key && position.sunk.length
      ? '旗闸还锁着，钥匙留在沉叶的另一边。撤回到过桥前再选。'
      : '这片荷叶没有出口，退一步换个方向吧。';
  const title = overlay === 'restart' ? '重新开始本关？' : overlay === 'pause' ? '已暂停'
    : result === 'win' ? '抵达小旗！' : result === 'empty' ? '步数已用尽' : '没有可跳的荷叶';

  return <main className={'pond-app' + (playing ? ' pond-playing' : '')}>
    <div className="pond-wrap">
      <header className="pond-header">
        <a className="pond-back" href="#/" aria-label="返回游戏大厅">‹ <span>游戏大厅</span></a>
        <div className="pond-brand"><img src={art.frog} alt=""/><b>{playing ? level.name : '池塘跳跳'}</b></div>
      </header>
      {page === 'ponds' && <>
        <section className="pond-hero">
          <img className="pond-hero-land" src={scenery[suggested.region]} alt=""/>
          <div className="pond-hero-paper">
            <div className="pond-kicker"><i/>{labelFor(suggested.region)} · 第 {numberOf(suggested)} 关</div>
            <h1>{suggested.name}</h1>
            <p>{recent ? '已保存上次落脚的位置。' : '点带白圈的荷叶，跳到小旗旁。'}</p>
            <button className="pond-primary" onClick={() => start(suggested)}>{recent ? '继续挑战' : '开始挑战'} <span aria-hidden="true">→</span></button>
          </div>
        </section>
        <section className="pond-section">
          <div className="pond-section-head"><h2>选择池塘</h2><span>共 {regions.length} 处水域</span></div>
          <div className="pond-cards">{regions.map(r => {
            const inRegion = levels.filter(l => l.region === r.id);
            const done = inRegion.filter(l => book.records[l.id]).length;
            return <button className="pond-card" key={r.id} onClick={() => browse('levels', r.id)}>
              <img src={scenery[r.id]} alt=""/><span className="pond-card-bottom"><span><strong>{r.name}</strong><small>{done} / {inRegion.length} 关已通过</small></span><b aria-hidden="true">↗</b></span>
            </button>;
          })}</div>
        </section>
      </>}
      {page === 'levels' && <section className="pond-book-layout">
        <aside className="pond-region-cover"><img src={scenery[region]} alt=""/><div><p>关卡册</p><h1>{labelFor(region)}</h1>
          <span>{regionLevels.filter(l => book.records[l.id]).length} / {regionLevels.length} 关已通过</span></div></aside>
        <div className="pond-list-pane"><div className="pond-section-head"><h2>选择关卡</h2><button className="pond-text-button" onClick={() => browse('ponds')}>更换池塘</button></div>
          <div className="pond-rows">{regionLevels.map((l,i) => levelRow(l,i))}</div></div>
      </section>}
      {page === 'favorites' && <section className="pond-library"><div className="pond-section-head"><h1>收藏的关卡</h1><span>{book.favorites.length} 关</span></div>
        {book.favorites.length ? <div className="pond-rows">{levels.filter(l => book.favorites.includes(l.id)).map((l,i) => levelRow(l,i,true))}</div>
          : <div className="pond-empty"><img src={art.lotus} alt=""/><h2>还没有收藏的关卡</h2><p>通关后可以收藏，也可以在暂停菜单收藏当前关。</p><button className="pond-primary" onClick={() => browse('levels')}>去选关</button></div>}
      </section>}
      {page === 'me' && <section className="pond-library"><div className="pond-section-head"><h1>我的进度</h1><span>{Object.keys(book.records).length} / {levels.length} 关已通过</span></div>
        {recent && <div className="pond-recent"><img src={art.frog} alt=""/><div><small>最近挑战</small><h2>{recent.name}</h2><p>{labelFor(recent.region)} · 剩余 {recent.limit - book.runs[recent.id].length} 步</p></div>
          <button className="pond-primary" onClick={() => start(recent)}>继续挑战</button></div>}
        <h2 className="pond-subhead">通关记录</h2>
        {Object.keys(book.records).length ? <div className="pond-rows">{levels.filter(l => book.records[l.id]).map((l,i) => levelRow(l,i))}</div>
          : <div className="pond-empty"><img src={art.flag} alt=""/><h2>第一面小旗等着你</h2><p>抵达旗点后，这里会记下你的最佳步数。</p><button className="pond-primary" onClick={() => browse('levels')}>去选关</button></div>}
      </section>}
      {playing && <section className={'pond-stage pond-stage-' + level.region}>
        <div className="pond-stagebar">
          <span className="pond-steps" role="status">剩余 <b>{position.left}</b> 步</span>
          <button type="button" className="pond-pause" aria-label="暂停游戏" onClick={pause}>Ⅱ <span>暂停</span></button>
        </div>
        <Board level={level} pos={position} historyLength={moves.length} blocked={!!overlay || result !== 'playing'}
          onMove={move} onHint={tell} onPause={pause}/>
        <div className="pond-board-note" role="status">{notice || (moves.length === 0 && level.id === 'first' ? '点白圈荷叶跳跃，也可以使用方向键。' : '')}</div>
      </section>}
      {!playing && <nav className="pond-dock" aria-label="池塘导航">{nav.map(t => <button type="button" key={t.page}
        aria-current={page === t.page ? 'page' : undefined} onClick={() => browse(t.page)}><img src={t.img} alt=""/><span>{t.label}</span></button>)}</nav>}
    </div>
    {!playing && notice && <div className="pond-toast" role="status">{notice}
      {removed && <button onClick={() => favorite(removed)}>撤销</button>}</div>}
    {playing && (overlay || result !== 'playing') && <PondDialog title={title} onClose={overlay ? () => showOverlay(null) : undefined}>
      <img className="pond-dialog-art" src={overlay === 'restart' ? art.leaf : result === 'win' && position.flower ? art.lotus : art.frog} alt=""/>
      <h2>{title}</h2>
      {overlay === 'restart' ? <><p>本次跳跃将清空，青蛙回到起点。</p><button className="pond-primary" onClick={() => showOverlay(null)}>保留当前局</button>
        <button className="pond-secondary" onClick={() => start(level,true)}>确认重新开始</button></>
      : overlay === 'pause' ? <><p>{level.name} · 剩余 {position.left} 步</p><button className="pond-primary" onClick={() => showOverlay(null)}>继续游戏</button>
        {!!moves.length && <button className="pond-secondary" onClick={undo}>撤回一步</button>}
        <div className="pond-dialog-links"><button onClick={() => showOverlay('restart')}>重新开始</button><button onClick={() => favorite(level.id)}>{book.favorites.includes(level.id) ? '取消收藏' : '收藏本关'}</button></div>
        <button className="pond-text-button" onClick={() => browse('levels')}>保存并退出</button></>
      : result === 'win' ? <><p>{level.name} · {moves.length} 步到旗</p>
        <div className="pond-achievement">最佳 {lastRecord?.best} 步{level.flower !== undefined && (position.flower ? ' · 本局获得花章' : ' · 本局未摘莲花')}</div>
        <button className="pond-primary" onClick={() => nextLevel ? start(nextLevel,true) : browse('levels')}>{nextLevel ? '下一关' : '返回关卡册'}</button>
        <button className="pond-secondary" onClick={() => start(level,true)}>再玩一次</button><button className="pond-text-button" onClick={() => favorite(level.id)}>{book.favorites.includes(level.id) ? '取消收藏' : '收藏本关'}</button></>
      : <><p>{failureMessage}</p>
        <button className="pond-primary" onClick={undo}>撤回一步</button><button className="pond-secondary" onClick={() => showOverlay('restart')}>重新开始</button>
        <button className="pond-text-button" onClick={() => browse('levels')}>返回关卡册</button></>}
    </PondDialog>}
  </main>;
}
