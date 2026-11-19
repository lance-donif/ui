import type { MouseEventHandler, ReactNode } from "react";
import { AudioSettingsButton } from "./AudioSettings";
import "./navigation.css";

type HeaderProps = {
  children: ReactNode;
  leading?: ReactNode;
  onHomeClick?: MouseEventHandler<HTMLAnchorElement>;
};

export function ArcadeHeader({ children, leading, onHomeClick }: HeaderProps) {
  return (
    <header className="arcade-mast">
      <div className="arcade-mast-inner">
        <div className="arcade-mast-leading">
          {leading ?? (
            <a className="arcade-home" href="#/" aria-label="返回游戏大厅" onClick={onHomeClick}>
              <span aria-hidden="true">←</span> 大厅
            </a>
          )}
        </div>
        <div className="arcade-mast-center">{children}</div>
        <div className="arcade-mast-settings"><AudioSettingsButton /></div>
      </div>
    </header>
  );
}
