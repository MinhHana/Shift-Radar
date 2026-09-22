import type { RawItem, Signal } from "./types";

const TTL_MS = 36 * 60 * 60 * 1000;
const MAX = 400;

type Entry = { at: number; fp: string; signal: Signal };

const cache = new Map<string, Entry>();

function fingerprint(text: string) {
  return text.slice(0, 160);
}

export function readCachedScore(item: Pick<RawItem, "id" | "text">): Signal | null {
  const hit = cache.get(item.id);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS || hit.fp !== fingerprint(item.text)) {
    cache.delete(item.id);
    return null;
  }
  return hit.signal;
}

export function writeCachedScore(item: Pick<RawItem, "id" | "text">, signal: Signal) {
  if (cache.has(item.id)) cache.delete(item.id);
  cache.set(item.id, { at: Date.now(), fp: fingerprint(item.text), signal });
  const overflow = cache.size - MAX;
  if (overflow <= 0) return;
  const keys = cache.keys();
  for (let i = 0; i < overflow; i++) {
    const next = keys.next();
    if (next.done) break;
    cache.delete(next.value);
  }
}
