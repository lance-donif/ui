import { Component, lazy, Suspense, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { catalog, Hall, HallHeader } from "./hub/Hall";
import { Resources } from "./hub/Resources";
import { storageUnavailable, subscribeToSaves } from "./shared/storage";

const games = {
  quilt: lazy(() => import("./games/quilt")),
  "toy-repair": lazy(() => import("./games/toy-repair")),
  pond: lazy(() => import("./games/pond")),
};

function watchRoute(notify: () => void) {
  window.addEventListener("hashchange", notify);
  return () => window.removeEventListener("hashchange", notify);
}

function currentRoute() {
  return window.location.hash.slice(1) || "/";
}

class GameBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) {
      return (
        <main className="lobby-message">
          <h1>游戏暂时无法打开</h1>
          <button type="button" onClick={() => window.location.reload()}>重新载入</button>
          <a href="#/">返回游戏大厅</a>
        </main>
      );
    }
    return this.props.children;
  }
}

export function App() {
  const route = useSyncExternalStore(watchRoute, currentRoute);
  const unavailable = useSyncExternalStore(subscribeToSaves, storageUnavailable);
  const surface = useRef<HTMLDivElement>(null);
  const previous = useRef(route);
  const resources = route === "/resources";
  const game = catalog.find(item => route === "/" + item.id);
  const Game = game && games[game.id];
  useEffect(() => {
    document.title = game ? game.title + " · 口袋游乐室" : resources ? "项目资源 · 口袋游乐室" : "口袋游乐室";
    if (previous.current !== route) {
      document.documentElement.scrollTop = 0;
      surface.current?.focus({ preventScroll: true });
      previous.current = route;
    }
  }, [game, resources, route]);

  return (
    <div ref={surface} className="arcade-surface" tabIndex={-1}>
      {unavailable && <aside role="status" className="save-warning">浏览器存储不可用。可以继续玩，本次进度只保留到页面关闭或刷新。</aside>}
      {route === "/" || resources ? (
        <div className="lobby">
          <HallHeader resources={resources} />
          {resources ? <Resources /> : <Hall />}
        </div>
      ) : Game ? (
        <GameBoundary key={route}>
          <Suspense fallback={<p role="status" className="lobby-message">正在打开{game.title}…</p>}><Game /></Suspense>
        </GameBoundary>
      ) : (
        <main className="lobby-message"><h1>找不到这款游戏</h1><a href="#/">返回游戏大厅</a></main>
      )}
    </div>
  );
}
