import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Signal, SourceKind, TabId, Trend } from "./types";
import { isFollowedHandle, isFounderVoice, isWatchedVoice, normalizeHandle } from "./voices";

export type LiveCurrent = {
  author: string;
  title: string;
  source: SourceKind;
  avatarUrl?: string;
};

type DeskState = {
  typesafeKey: string;
  focus: string;
  tab: TabId;
  selectedId: string | null;
  signals: Signal[];
  lastScanAt: string | null;
  stats: { xFetched: number; githubFetched: number; scored: number; kept: number } | null;
  warnings: string[];
  isScanning: boolean;
  error: string | null;
  settingsOpen: boolean;
  liveStatus: string;
  liveCurrent: LiveCurrent | null;
  lastArrivedId: string | null;
  theme: "light" | "dark";
  briefing: string[];
  trends: Trend[];
  activeTrendId: string | null;
  trendNotes: Record<string, string>;
  explainingTrendId: string | null;
  extraVoices: string[];
  setKey: (key: string) => void;
  setFocus: (focus: string) => void;
  setTab: (tab: TabId) => void;
  select: (id: string | null) => void;
  setSettingsOpen: (open: boolean) => void;
  beginLiveScan: () => void;
  setLive: (status: string, current?: LiveCurrent | null) => void;
  pushSignal: (signal: Signal) => void;
  bumpFetched: (source: SourceKind, count: number) => void;
  addWarning: (warning: string) => void;
  finishLiveScan: () => void;
  applyScan: (payload: {
    signals: Signal[];
    stats: { xFetched: number; githubFetched: number; scored: number; kept: number };
    warnings: string[];
  }) => void;
  setScanning: (v: boolean) => void;
  setError: (error: string | null) => void;
  setTheme: (theme: "light" | "dark") => void;
  setBriefing: (briefing: string[]) => void;
  setTrends: (trends: Trend[]) => void;
  setActiveTrend: (id: string | null) => void;
  setTrendNote: (id: string, text: string) => void;
  setExplainingTrend: (id: string | null) => void;
  addVoice: (handle: string) => "ok" | "duplicate" | "invalid";
  removeVoice: (handle: string) => void;
};

export const useDesk = create<DeskState>()(
  persist(
    (set, get) => ({
      typesafeKey: "",
      focus: "",
      tab: "all",
      selectedId: null,
      signals: [],
      lastScanAt: null,
      stats: null,
      warnings: [],
      isScanning: false,
      error: null,
      settingsOpen: false,
      liveStatus: "",
      liveCurrent: null,
      lastArrivedId: null,
      theme: "light",
      briefing: [],
      trends: [],
      activeTrendId: null,
      trendNotes: {},
      explainingTrendId: null,
      extraVoices: [],
      setKey: (typesafeKey) => set({ typesafeKey }),
      setFocus: (focus) => set({ focus }),
      setTab: (tab) => set({ tab, selectedId: null, activeTrendId: null }),
      select: (selectedId) => set({ selectedId }),
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
      beginLiveScan: () =>
        set({
          isScanning: true,
          error: null,
          warnings: [],
          selectedId: null,
          lastArrivedId: null,
          liveStatus: "Pulling sources…",
          liveCurrent: null,
          tab: "all",
          stats: { xFetched: 0, githubFetched: 0, scored: 0, kept: 0 },
        }),
      setLive: (liveStatus, liveCurrent) =>
        set((s) => ({
          liveStatus,
          liveCurrent: liveCurrent === undefined ? s.liveCurrent : liveCurrent,
        })),
      pushSignal: (signal) =>
        set((s) => {
          const signals = [...s.signals.filter((x) => x.id !== signal.id), signal];
          const stats = s.stats ?? { xFetched: 0, githubFetched: 0, scored: 0, kept: 0 };
          return {
            signals,
            lastArrivedId: signal.kept ? signal.id : s.lastArrivedId,
            stats: {
              ...stats,
              scored: stats.scored + 1,
              kept: stats.kept + (signal.kept ? 1 : 0),
            },
          };
        }),
      bumpFetched: (source, count) =>
        set((s) => {
          const stats = s.stats ?? { xFetched: 0, githubFetched: 0, scored: 0, kept: 0 };
          return {
            stats: {
              ...stats,
              xFetched: stats.xFetched + (source === "x" ? count : 0),
              githubFetched: stats.githubFetched + (source === "github" ? count : 0),
            },
          };
        }),
      addWarning: (warning) =>
        set((s) => (s.warnings.includes(warning) ? s : { warnings: [...s.warnings, warning] })),
      finishLiveScan: () =>
        set({
          isScanning: false,
          liveCurrent: null,
          lastScanAt: new Date().toISOString(),
        }),
      applyScan: ({ signals, stats, warnings }) =>
        set({
          signals,
          stats,
          warnings,
          lastScanAt: new Date().toISOString(),
          isScanning: false,
          error: null,
          selectedId: signals.find((s) => s.kept)?.id ?? signals[0]?.id ?? null,
          tab: "all",
          liveStatus: "",
          liveCurrent: null,
        }),
      setScanning: (isScanning) => set(isScanning ? { isScanning, error: null } : { isScanning }),
      setError: (error) => set({ error, isScanning: false, liveCurrent: null }),
      setTheme: (theme) => set({ theme }),
      setBriefing: (briefing) => set({ briefing }),
      setTrends: (trends) => set({ trends, briefing: trends.map((t) => t.title), activeTrendId: null }),
      setActiveTrend: (activeTrendId) => set({ activeTrendId, tab: "all" }),
      setTrendNote: (id, text) => set((s) => ({ trendNotes: { ...s.trendNotes, [id]: text } })),
      setExplainingTrend: (explainingTrendId) => set({ explainingTrendId }),
      addVoice: (raw) => {
        const handle = normalizeHandle(raw);
        if (handle.length < 1) return "invalid";
        if (isFollowedHandle(handle, get().extraVoices)) return "duplicate";
        set({ extraVoices: [...get().extraVoices, handle] });
        return "ok";
      },
      removeVoice: (handle) =>
        set((s) => ({
          extraVoices: s.extraVoices.filter((h) => h.toLowerCase() !== handle.replace(/^@/, "").toLowerCase()),
        })),
    }),
    {
      name: "shift-radar-desk",
      partialize: (s) => ({
        typesafeKey: s.typesafeKey,
        focus: s.focus,
        signals: s.signals,
        lastScanAt: s.lastScanAt,
        stats: s.stats,
        warnings: s.warnings,
        theme: s.theme,
        briefing: s.briefing,
        trends: s.trends,
        activeTrendId: s.activeTrendId,
        trendNotes: s.trendNotes,
        extraVoices: s.extraVoices,
      }),
    },
  ),
);

export function visibleSignals(
  signals: Signal[],
  tab: TabId,
  trend?: Trend | null,
  extraVoices: string[] = [],
): Signal[] {
  const kept = signals.filter((s) => s.kept);
  if (trend?.signalIds.length) {
    const allow = new Set(trend.signalIds);
    return kept.filter((s) => allow.has(s.id)).sort((a, b) => b.composite - a.composite);
  }
  switch (tab) {
    case "founders":
      return kept
        .filter((s) => isFounderVoice(s.author))
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    case "hidden":
      return kept
        .filter((s) => s.scores.isUnderdiscussed >= 0.55)
        .sort((a, b) => b.composite - a.composite);
    case "impact":
      return [...kept].sort((a, b) => b.composite - a.composite);
    case "new":
      return kept
        .filter((s) => s.scores.isNewInfo >= 0.5)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    case "research":
      return kept.filter((s) => s.category === "research" || s.problem === "research" || s.audience === "researcher");
    case "repo":
      return kept.filter((s) => s.source === "github");
    case "product":
      return kept.filter((s) => s.category === "product" || s.problem === "product" || s.problem === "cli");
    case "kin":
      return kept
        .filter(
          (s) =>
            s.scores.typesafeLikeness >= 0.5 ||
            s.scores.impactUsage >= 0.55 ||
            (s.scores.stackShift >= 0.5 && s.scores.impactCoding >= 0.45),
        )
        .sort(
          (a, b) =>
            b.scores.typesafeLikeness + b.scores.impactUsage - (a.scores.typesafeLikeness + a.scores.impactUsage),
        );
    case "voices":
      return kept
        .filter((s) => isWatchedVoice(s.author, extraVoices))
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    case "dropped":
      return signals.filter((s) => !s.kept);
    default:
      return [...kept].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }
}
