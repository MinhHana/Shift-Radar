import type { RawItem, Signal } from "./types";

const JEV_KEY = "shift-radar-jev-v1";
const FETCH_KEY = "shift-radar-fetch-v1";
const JEV_TTL_MS = 36 * 60 * 60 * 1000;
const FETCH_TTL_MS = 12 * 60 * 1000;
const JEV_MAX = 400;

type Stamp<T> = { at: number; fp?: string; value: T };

function readMap<T>(key: string): Record<string, Stamp<T>> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Stamp<T>>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap<T>(key: string, map: Record<string, Stamp<T>>) {
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* quota */
  }
}

function fp(text: string) {
  return text.slice(0, 160);
}

export function getCachedScore(item: RawItem): Signal | null {
  if (typeof localStorage === "undefined") return null;
  const map = readMap<Signal>(JEV_KEY);
  const hit = map[item.id];
  if (!hit) return null;
  if (Date.now() - hit.at > JEV_TTL_MS) return null;
  if (hit.fp && hit.fp !== fp(item.text)) return null;
  return hit.value;
}

export function setCachedScore(signal: Signal) {
  if (typeof localStorage === "undefined") return;
  const map = readMap<Signal>(JEV_KEY);
  map[signal.id] = { at: Date.now(), fp: fp(signal.text), value: signal };
  const ids = Object.keys(map);
  if (ids.length > JEV_MAX) {
    ids
      .sort((a, b) => (map[a]?.at ?? 0) - (map[b]?.at ?? 0))
      .slice(0, ids.length - JEV_MAX)
      .forEach((id) => {
        delete map[id];
      });
  }
  writeMap(JEV_KEY, map);
}

export function getCachedFetch(key: string): RawItem[] | null {
  if (typeof localStorage === "undefined") return null;
  const map = readMap<RawItem[]>(FETCH_KEY);
  const hit = map[key];
  if (!hit) return null;
  if (Date.now() - hit.at > FETCH_TTL_MS) return null;
  return Array.isArray(hit.value) ? hit.value : null;
}

export function setCachedFetch(key: string, items: RawItem[]) {
  if (typeof localStorage === "undefined") return;
  const map = readMap<RawItem[]>(FETCH_KEY);
  map[key] = { at: Date.now(), value: items };
  writeMap(FETCH_KEY, map);
}

export function fetchCacheKey(kind: string, extra: string) {
  return `${kind}:${extra.trim().toLowerCase()}`;
}
