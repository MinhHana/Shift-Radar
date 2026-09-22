import type { Signal, SourceKind } from "./types";

export type LiveCurrent = {
  author: string;
  title: string;
  source: SourceKind;
  avatarUrl?: string;
};

export type ScanStats = {
  xFetched: number;
  githubFetched: number;
  scored: number;
  kept: number;
};

export type LiveDeskSlice = {
  signals: Signal[];
  firstSeen: Record<string, number>;
  lastArrivedId: string | null;
  scanGen: number;
  warnings: string[];
  stats: ScanStats | null;
  liveStatus: string;
  liveCurrent: LiveCurrent | null;
};

export type LiveChunk = {
  liveStatus: string;
  liveCurrent: LiveCurrent | null;
  signals: Signal[];
  warnings: string[];
  stats: ScanStats | null;
};

export function sameStats(a: ScanStats | null, b: ScanStats | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.xFetched === b.xFetched &&
    a.githubFetched === b.githubFetched &&
    a.scored === b.scored &&
    a.kept === b.kept
  );
}

export function sameLiveCurrent(a: LiveCurrent | null, b: LiveCurrent | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.author === b.author && a.title === b.title && a.source === b.source && a.avatarUrl === b.avatarUrl;
}

export function sameTrends(a: { id: string; title: string }[], b: { id: string; title: string }[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id || a[i].title !== b[i].title) return false;
  }
  return true;
}

function mergeSignals(prev: Signal[], incoming: Signal[]) {
  if (!incoming.length) return prev;
  const index = new Map<string, number>();
  const next = prev.slice();
  for (let i = 0; i < next.length; i++) index.set(next[i].id, i);
  let changed = false;
  for (const signal of incoming) {
    const at = index.get(signal.id);
    if (at === undefined) {
      index.set(signal.id, next.length);
      next.push(signal);
      changed = true;
    } else if (next[at] !== signal) {
      next[at] = signal;
      changed = true;
    }
  }
  return changed ? next : prev;
}

function stampArrival(state: LiveDeskSlice, incoming: Signal[]) {
  if (!incoming.length) {
    return { firstSeen: state.firstSeen, lastArrivedId: state.lastArrivedId };
  }
  let firstSeen = state.firstSeen;
  let lastArrivedId = state.lastArrivedId;
  const born = state.scanGen || 1;
  for (const signal of incoming) {
    if (firstSeen[signal.id] === undefined) {
      if (firstSeen === state.firstSeen) firstSeen = { ...state.firstSeen };
      firstSeen[signal.id] = born;
    }
    if (signal.kept) lastArrivedId = signal.id;
  }
  return { firstSeen, lastArrivedId };
}

function mergeWarnings(prev: string[], incoming: string[]) {
  if (!incoming.length) return prev;
  let next = prev;
  for (const warning of incoming) {
    if (next.includes(warning)) continue;
    if (next === prev) next = prev.slice();
    next.push(warning);
  }
  return next;
}

export function foldLiveChunk(state: LiveDeskSlice, chunk: LiveChunk): LiveDeskSlice | null {
  const signals = mergeSignals(state.signals, chunk.signals);
  const { firstSeen, lastArrivedId } = stampArrival(state, chunk.signals);
  const warnings = mergeWarnings(state.warnings, chunk.warnings);
  const stats = chunk.stats && !sameStats(state.stats, chunk.stats) ? chunk.stats : state.stats;
  if (
    signals === state.signals &&
    firstSeen === state.firstSeen &&
    lastArrivedId === state.lastArrivedId &&
    warnings === state.warnings &&
    stats === state.stats &&
    state.liveStatus === chunk.liveStatus &&
    sameLiveCurrent(state.liveCurrent, chunk.liveCurrent)
  ) {
    return null;
  }
  return {
    signals,
    firstSeen,
    lastArrivedId,
    scanGen: state.scanGen,
    warnings,
    stats,
    liveStatus: chunk.liveStatus,
    liveCurrent: chunk.liveCurrent,
  };
}
