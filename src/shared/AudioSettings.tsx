import { useId, useSyncExternalStore } from "react";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@ui-sdk/react/dialog";
import { playCue, readAudioSettings, setAudioSettings, subscribeAudioSettings } from "./audio";
import "./AudioSettings.css";

const channels = [
  { key: "music", label: "背景音乐" },
  { key: "effects", label: "游戏音效" },
] as const;

export function AudioSettingsButton() {
  const settings = useSyncExternalStore(subscribeAudioSettings, readAudioSettings, readAudioSettings);
  const id = useId();
  const silent = settings.muted || (settings.music === 0 && settings.effects === 0);

  return (
    <Dialog>
      <DialogTrigger className="audio-trigger" aria-label="声音设置" title="声音设置">
        <span className="audio-speaker" data-silent={silent} aria-hidden="true"><i /></span>
      </DialogTrigger>
      <DialogContent className="audio-panel" initialFocus="content">
        <div className="audio-heading">
          <DialogTitle className="audio-title">声音设置</DialogTitle>
          <DialogClose className="audio-close" aria-label="关闭声音设置">×</DialogClose>
        </div>
        <label className="audio-mute">
          <span>全部静音</span>
          <input type="checkbox" role="switch" checked={settings.muted}
            onChange={event => setAudioSettings({ muted: event.currentTarget.checked })} />
        </label>
        {channels.map(({ key, label }) => {
          const value = Math.round(settings[key] * 100);
          const fieldId = `${id}-${key}`;
          return (
            <div className="audio-channel" key={key}>
              <label htmlFor={fieldId}>{label}</label>
              <span aria-hidden="true">{value}%</span>
              <input id={fieldId} type="range" min="0" max="100" step="1" value={value}
                aria-valuetext={`${value}%`}
                onChange={event => setAudioSettings({ [key]: event.currentTarget.valueAsNumber / 100 })} />
            </div>
          );
        })}
        <button className="audio-preview" type="button" disabled={settings.muted || settings.effects === 0}
          onClick={() => playCue("select")}>
          <span aria-hidden="true">▶</span> 试听音效
        </button>
      </DialogContent>
    </Dialog>
  );
}
