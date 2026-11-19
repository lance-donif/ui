export type GameId = "quilt" | "toy-repair" | "pond";

type GameSave<T> = {
  version: 1;
  data: T;
  hasProgress: boolean;
};

const prefix = "lance-ui:games:";
const changed = "arcade-save-change";
const temporary = new Map<GameId, GameSave<unknown>>();

function readEnvelope<T>(id: GameId) {
  const session = temporary.get(id);
  if (session) return session as GameSave<T>;
  try {
    const raw = window.localStorage.getItem(prefix + id);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    return entry?.version === 1 && typeof entry.hasProgress === "boolean" && entry.data != null
      ? entry as GameSave<T>
      : null;
  } catch {
    return null;
  }
}

export function readGameSave<T>(id: GameId) {
  return readEnvelope<T>(id)?.data ?? null;
}

export function writeGameSave<T>(id: GameId, data: T, hasProgress: boolean) {
  const entry: GameSave<T> = { version: 1, data, hasProgress };
  try {
    window.localStorage.setItem(prefix + id, JSON.stringify(entry));
    temporary.delete(id);
  } catch {
    temporary.set(id, entry);
  }
  window.dispatchEvent(new Event(changed));
}

export function hasGameProgress(id: GameId) {
  return readEnvelope(id)?.hasProgress === true;
}

export function storageUnavailable() {
  try {
    void window.localStorage.length;
    return temporary.size > 0;
  } catch {
    return true;
  }
}

export function subscribeToSaves(update: () => void) {
  window.addEventListener(changed, update);
  window.addEventListener("storage", update);
  return () => {
    window.removeEventListener(changed, update);
    window.removeEventListener("storage", update);
  };
}
