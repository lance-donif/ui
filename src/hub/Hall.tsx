import { useSyncExternalStore } from "react";
import { ArcadeHeader } from "../shared/ArcadeHeader";
import { hasGameProgress, storageUnavailable, subscribeToSaves, type GameId } from "../shared/storage";
import quilt from "./art/quilt.webp";
import toy from "./art/toy-repair.webp";
import pond from "./art/pond.webp";
import toybox from "./art/toybox.webp";

export const catalog = [
  { id: "quilt", title: "拼布工坊", genre: "手作解谜", detail: "滑动花布拼出图案，再给作品绣上一枚布标。", image: quilt },
  { id: "toy-repair", title: "玩具修理所", genre: "模拟维修", detail: "听听顾客的难题，拿起工具让老玩具重新动起来。", image: toy },
  { id: "pond", title: "池塘跳跳", genre: "路线策略", detail: "算好每一跳，在荷叶沉下去之前带着莲花到岸。", image: pond },
] as const satisfies ReadonlyArray<{ id: GameId; title: string; genre: string; detail: string; image: string }>;

export function HallHeader({ resources }: { resources: boolean }) {
  return (
    <ArcadeHeader leading={
      <a className="lobby-brand" href="#/" aria-label="口袋游乐室首页">
        <span className="lobby-mark" aria-hidden="true"><i /><i /><i /><i /></span>
        <span>口袋游乐室</span>
      </a>
    }>
      <nav className="lobby-links" aria-label="主导航">
        <a href="#/" aria-current={!resources ? "page" : undefined}>游戏大厅</a>
        <a href="#/resources" aria-current={resources ? "page" : undefined}>项目资源</a>
      </nav>
    </ArcadeHeader>
  );
}

function GameCard({ game }: { game: (typeof catalog)[number] }) {
  const resume = useSyncExternalStore(subscribeToSaves, () => hasGameProgress(game.id));
  return (
    <a className="lobby-card" data-game={game.id} href={"#/" + game.id}>
      <div className="lobby-card-art"><img src={game.image} alt="" width="1080" height="810" /></div>
      <div className="lobby-card-copy">
        <div className="lobby-card-heading"><h3>{game.title}</h3><span>{game.genre}</span></div>
        <p>{game.detail}</p>
        <div className="lobby-card-action">{resume ? "继续游玩" : "开始游戏"}<span aria-hidden="true">→</span></div>
      </div>
    </a>
  );
}

export function Hall() {
  const unavailable = useSyncExternalStore(subscribeToSaves, storageUnavailable);
  return (
    <main className="lobby-width lobby-main">
      <section className="lobby-hero" aria-labelledby="welcome-title">
        <img src={toybox} width="1800" height="600" alt="" fetchPriority="high" />
        <div className="lobby-hero-copy">
          <h1 id="welcome-title">今天想玩什么<span>？</span></h1>
          <p>拼一幅布画，修好一只玩具，<br />或陪小青蛙跳过池塘。</p>
        </div>
      </section>
      <section aria-labelledby="game-shelf">
        <div className="lobby-shelf-title">
          <h2 id="game-shelf">游戏收藏架</h2>
          {!unavailable && <p><span className="lobby-save-icon" aria-hidden="true" />进度保存在此浏览器</p>}
        </div>
        <div className="lobby-cards">
          {catalog.map(game => <GameCard key={game.id} game={game} />)}
        </div>
      </section>
    </main>
  );
}
