import { readGameSave } from "./storage";
import { renderScoreStep, scoreStepCount, scoreStepDuration, type AudioScene } from "./audio-score";
import { renderCue, type AudioCue } from "./audio-cues";

export type { AudioScene, AudioCue };
export type AudioSettings = { music: number; effects: number; muted: boolean };

const settingsKey = "lance-ui:audio:v1";
const defaults: AudioSettings = Object.freeze({ music: .55, effects: .78, muted: false });
const subscribers = new Set<() => void>();
let snapshot: AudioSettings | null = null;
let unsavedSettings = false;
let cueGeneration = 0;
let connections = 0;
let scene: AudioScene = "lobby";
let diagnosticQuiet = false;
let away = false;
let resumeStep = 0;
let mixer: Mixer | null = null;

type Track = {
  bus: GainNode;
  scene: AudioScene;
  next: number;
  step: number;
  startedAt: number;
  firstStep: number;
};

type Mixer = {
  ctx: AudioContext;
  main: GainNode;
  music: GainNode;
  effects: GainNode;
  ordinary: GainNode;
  clues: GainNode;
  track: Track | null;
  fading: Map<GainNode, number>;
  timer?: number;
  clueTimer?: number;
  clueUntil: number;
  resuming?: Promise<void>;
};

function volume(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}

function normalize(value: Partial<AudioSettings> | null, base: AudioSettings) {
  return Object.freeze({
    music: volume(value?.music, base.music),
    effects: volume(value?.effects, base.effects),
    muted: typeof value?.muted === "boolean" ? value.muted : base.muted,
  });
}

function persist(value: AudioSettings) {
  try {
    window.localStorage.setItem(settingsKey, JSON.stringify(value));
    unsavedSettings = false;
  } catch { unsavedSettings = true; }
}

function storedSettings() {
  try {
    const raw = window.localStorage.getItem(settingsKey);
    return raw === null ? null : normalize(JSON.parse(raw), defaults);
  } catch { return null; }
}

function loadSettings() {
  const saved = storedSettings();
  if (saved) return saved;
  const oldSave = readGameSave<{ sound?: boolean }>("toy-repair");
  const next = normalize({ muted: oldSave?.sound === false }, defaults);
  persist(next);
  return next;
}

export function readAudioSettings() {
  if (typeof window === "undefined") return defaults;
  return snapshot ??= loadSettings();
}

function publish(next: AudioSettings) {
  const old = snapshot;
  if (old && old.music === next.music && old.effects === next.effects && old.muted === next.muted) return;
  snapshot = next;
  if (mixer) applySettings(mixer, old);
  for (const notify of subscribers) notify();
}

export function setAudioSettings(change: Partial<AudioSettings>) {
  const next = normalize(change, readAudioSettings());
  persist(next);
  publish(next);
}

export function subscribeAudioSettings(listener: () => void) {
  subscribers.add(listener);
  return () => { subscribers.delete(listener); };
}

function hidden() {
  return away || document.visibilityState === "hidden";
}

function resetInput(m: Mixer, key: "ordinary" | "clues") {
  m[key].disconnect();
  m[key] = m.ctx.createGain();
  m[key].connect(m.effects);
}

function silenceEffects(m: Mixer) {
  cueGeneration++;
  resetInput(m, "ordinary");
  resetInput(m, "clues");
  window.clearTimeout(m.clueTimer);
  m.clueUntil = 0;
}

function stopMusic(m: Mixer, fade: boolean) {
  window.clearInterval(m.timer);
  m.timer = undefined;
  if (!fade) {
    for (const [bus, timer] of m.fading) {
      window.clearTimeout(timer);
      bus.disconnect();
    }
    m.fading.clear();
  }
  const track = m.track;
  if (!track) return;
  m.track = null;
  const now = m.ctx.currentTime;
  const duration = scoreStepDuration(track.scene);
  const count = scoreStepCount(track.scene);
  const elapsed = Math.max(0, Math.ceil((now - track.startedAt) / duration));
  resumeStep = (track.firstStep + elapsed) % count;
  if (!fade) { track.bus.disconnect(); return; }
  const gain = track.bus.gain;
  const current = gain.value;
  gain.cancelScheduledValues(now);
  gain.setValueAtTime(current, now);
  gain.linearRampToValueAtTime(0, now + .30);
  const timer = window.setTimeout(() => {
    track.bus.disconnect();
    m.fading.delete(track.bus);
  }, 350);
  m.fading.set(track.bus, timer);
}

function schedule(m: Mixer) {
  const track = m.track;
  if (!track) return;
  const now = m.ctx.currentTime;
  const stepTime = scoreStepDuration(track.scene);
  const count = scoreStepCount(track.scene);
  if (track.next < now) {
    const late = Math.ceil((now - track.next) / stepTime);
    track.next += late * stepTime;
    track.step = (track.step + late) % count;
  }
  while (track.next < now + .20) {
    renderScoreStep(m.ctx, track.bus, track.scene, track.step, track.next);
    track.next += stepTime;
    track.step = (track.step + 1) % count;
  }
}

function syncMusic(m: Mixer) {
  const settings = readAudioSettings();
  if (!connections || hidden() || m.ctx.state !== "running" || settings.muted || !settings.music ||
      diagnosticQuiet || m.clueUntil > m.ctx.currentTime) {
    stopMusic(m, false);
    return;
  }
  if (m.track) return;
  const bus = m.ctx.createGain();
  const now = m.ctx.currentTime;
  bus.gain.setValueAtTime(0, now);
  bus.gain.linearRampToValueAtTime(1, now + .28);
  bus.connect(m.music);
  const startedAt = now + .012;
  m.track = { bus, scene, next: startedAt, step: resumeStep, startedAt, firstStep: resumeStep };
  schedule(m);
  m.timer = window.setInterval(() => schedule(m), 75);
}

function applySettings(m: Mixer, last: AudioSettings | null) {
  const value = readAudioSettings();
  m.music.gain.value = value.music;
  m.effects.gain.value = value.effects;
  m.main.gain.value = value.muted || hidden() ? 0 : 1;
  if ((value.muted && !last?.muted) || (!value.effects && last?.effects)) silenceEffects(m);
  syncMusic(m);
}

function makeMixer() {
  const Constructor = window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Constructor) return null;
  try {
    const ctx = new Constructor();
    const main = ctx.createGain();
    const music = ctx.createGain();
    const effects = ctx.createGain();
    const ordinary = ctx.createGain();
    const clues = ctx.createGain();
    music.connect(main);
    effects.connect(main);
    main.connect(ctx.destination);
    ordinary.connect(effects);
    clues.connect(effects);
    const m: Mixer = { ctx, main, music, effects, ordinary, clues, track: null, fading: new Map(), clueUntil: 0 };
    ctx.onstatechange = () => {
      if (mixer === m) applySettings(m, readAudioSettings());
    };
    return m;
  } catch { return null; }
}

function activate() {
  if (!connections || hidden()) return;
  const m = mixer ??= makeMixer();
  if (!m) return;
  applySettings(m, readAudioSettings());
  if (m.ctx.state !== "running" && !m.resuming) {
    m.resuming = m.ctx.resume().then(() => {
      if (mixer === m && connections && !hidden()) applySettings(m, readAudioSettings());
    }).catch(() => {}).finally(() => { m.resuming = undefined; });
  }
}

function visibility() {
  const m = mixer;
  if (!m) return;
  if (!hidden()) { activate(); return; }
  m.main.gain.value = 0;
  stopMusic(m, false);
  silenceEffects(m);
  void m.ctx.suspend().then(() => {
    if (mixer === m && connections && !hidden()) activate();
  }).catch(() => {});
}

function leavePage() { away = true; visibility(); }
function enterPage() { away = false; visibility(); }
function storage(event: StorageEvent) {
  if (event.key === settingsKey || event.key === null) publish(loadSettings());
}

export function connectAudio() {
  if (typeof window === "undefined") return () => {};
  if (++connections === 1) {
    away = false;
    const stored = storedSettings();
    if (stored && !unsavedSettings) publish(stored);
    else readAudioSettings();
    for (const type of ["pointerdown", "pointerup", "touchend", "keydown", "click"]) {
      window.addEventListener(type, activate, { capture: true, passive: true });
    }
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", leavePage);
    window.addEventListener("pageshow", enterPage);
    window.addEventListener("storage", storage);
  }
  let connected = true;
  return () => {
    if (!connected) return;
    connected = false;
    if (--connections) return;
    for (const type of ["pointerdown", "pointerup", "touchend", "keydown", "click"]) {
      window.removeEventListener(type, activate, true);
    }
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("pagehide", leavePage);
    window.removeEventListener("pageshow", enterPage);
    window.removeEventListener("storage", storage);
    if (mixer) {
      const m = mixer;
      mixer = null;
      stopMusic(m, false);
      window.clearTimeout(m.clueTimer);
      m.main.disconnect();
      m.ctx.onstatechange = null;
      void m.ctx.close().catch(() => {});
    }
    resumeStep = 0;
    diagnosticQuiet = false;
    away = false;
  };
}

export function setAudioScene(next: AudioScene) {
  if (next === scene) return;
  if (mixer) {
    stopMusic(mixer, true);
    silenceEffects(mixer);
  }
  scene = next;
  if (next !== "toy-repair") diagnosticQuiet = false;
  resumeStep = 0;
  if (mixer) syncMusic(mixer);
}

export function setDiagnosticQuiet(quiet: boolean) {
  if (quiet === diagnosticQuiet) return;
  diagnosticQuiet = quiet;
  if (!mixer) return;
  cueGeneration++;
  if (quiet) resetInput(mixer, "ordinary");
  syncMusic(mixer);
}

function cueNow(m: Mixer, cue: AudioCue) {
  const settings = readAudioSettings();
  if (mixer !== m || !connections || hidden() || settings.muted || !settings.effects || m.ctx.state !== "running") return;
  const isClue = cue === "musicTwo" || cue === "musicThree";
  if (!isClue && (diagnosticQuiet || m.clueUntil > m.ctx.currentTime)) return;
  const when = m.ctx.currentTime + .008;
  if (isClue) {
    stopMusic(m, false);
    silenceEffects(m);
    m.clueUntil = when + (cue === "musicTwo" ? .36 : .53);
    m.clueTimer = window.setTimeout(() => {
      if (mixer !== m) return;
      m.clueUntil = 0;
      syncMusic(m);
    }, (m.clueUntil - m.ctx.currentTime) * 1000 + 20);
  }
  renderCue(m.ctx, isClue ? m.clues : m.ordinary, cue, when);
}

export function playCue(cue: AudioCue) {
  const m = mixer;
  if (!m || !connections || hidden()) return;
  if (m.ctx.state === "running") { cueNow(m, cue); return; }
  const generation = cueGeneration;
  const requested = performance.now();
  const requestedScene = scene;
  void m.resuming?.then(() => {
    if (generation === cueGeneration && scene === requestedScene && performance.now() - requested < 400) cueNow(m, cue);
  });
}
