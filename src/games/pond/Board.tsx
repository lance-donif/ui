import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { art } from './art';
import { coordinate, landings, type Level, type Position } from './game';

type Props = {
  level: Level;
  pos: Position;
  historyLength: number;
  blocked: boolean;
  onMove: (cell: number) => void;
  onHint: (hint: string) => void;
  onPause: () => void;
};

export default function Board({ level, pos, historyLength, blocked, onMove, onHint, onPause }: Props) {
  const board = useRef<HTMLDivElement>(null);
  const legal = landings(level, pos);
  useEffect(() => {
    board.current?.focus({ preventScroll: true });
  }, [level.id, blocked]);

  function choose(cell: number) {
    if (blocked) return;
    if (legal.includes(cell)) return onMove(cell);
    if (cell === level.flag && level.key !== undefined && !pos.key) onHint('先到金钥匙的荷叶，再来这座水闸。');
    else onHint('只有白圈荷叶可以落脚。');
  }

  return <div className="pond-board" role="group" aria-label="池塘棋盘，使用方向键跳跃" ref={board} tabIndex={0}
    onKeyDown={event => {
      if (blocked || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      if (event.key === 'Escape') { event.preventDefault(); onPause(); return; }
      const deltas: Record<string, number> = { ArrowUp: -3, ArrowDown: 3, ArrowLeft: -1, ArrowRight: 1 };
      const delta = deltas[event.key];
      if (delta !== undefined) {
        event.preventDefault();
        const cell = pos.frog + delta;
        if (Math.abs(delta) === 1 && Math.floor(pos.frog / 3) !== Math.floor(cell / 3)) return;
        choose(cell);
      }
    }}>
    <img className="pond-water" src={art.water} alt="" draggable={false}/>
    <div className="pond-grid">
      {Array.from({ length: 9 }, (_, cell) => {
        const sunk = pos.sunk.includes(cell);
        const leaf = level.leaves.includes(cell) && !sunk;
        const cracked = level.cracks?.includes(cell);
        const isFlag = cell === level.flag;
        const holdsKey = cell === level.key && !pos.key;
        const holdsFlower = cell === level.flower && !pos.flower;
        const item = isFlag ? '旗点' : holdsKey ? '钥匙' : holdsFlower ? '莲花' : cracked ? '裂纹荷叶' : '荷叶';
        if (!leaf) return <span className={sunk ? 'pond-cell pond-sunk' : 'pond-cell'} key={cell} aria-hidden="true"/>;
        return <button type="button" key={cell} className={'pond-cell pond-pad' + (legal.includes(cell) ? ' available' : '')}
          tabIndex={blocked || !legal.includes(cell) ? -1 : 0}
          aria-label={coordinate(cell) + ' ' + item + (pos.frog === cell ? '，青蛙所在' : '')}
          onClick={() => choose(cell)}>
          <img className="pond-leaf" src={cracked ? art.cracked : art.leaf} alt="" draggable={false}/>
          {isFlag && <>
            <img className="pond-item pond-flag" src={art.flag} alt="" draggable={false}/>
            {level.key !== undefined && <img className="pond-item pond-gate" src={pos.key ? art.gateOpen : art.gateClosed} alt="" draggable={false}/>}
          </>}
          {holdsKey && <img className="pond-item" src={art.key} alt="" draggable={false}/>}
          {holdsFlower && <img className="pond-item" src={art.lotus} alt="" draggable={false}/>}
        </button>;
      })}
      <div className="pond-frog-track" style={{ '--x': pos.frog % 3, '--y': Math.floor(pos.frog / 3) } as CSSProperties}>
        <div key={historyLength} className={'pond-rider' + (historyLength ? ' pond-hop' : '')}>
          <img className="pond-frog" src={art.frog} alt="" draggable={false}/>
          {pos.flower && <img className="pond-carried" src={art.lotus} alt="随身莲花" draggable={false}/>}
        </div>
      </div>
    </div>
  </div>;
}
