import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Signal, TabId } from "./types";

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
  setKey: (key: string) => void;
  setFocus: (focus: string) => void;
  setTab: (tab: TabId) => void;
  select: (id: string | null) => void;
  setSettingsOpen: (open: boolean) => void;
  applyScan: (payload: {
    signals: Signal[];
    stats: { xFetched: number; githubFetched: number; scored: number; kept: number };
    warnings: string[];
  }) => void;
  setScanning: (v: boolean) => void;
  setError: (error: string | null) => void;
};

export const useDesk = create<DeskState>()(
  persist(
    (set) => ({
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
      setKey: (typesafeKey) => set({ typesafeKey }),
      setFocus: (focus) => set({ focus }),
      setTab: (tab) => set({ tab, selectedId: null }),
      select: (selectedId) => set({ selectedId }),
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
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
        }),
      setScanning: (isScanning) => set(isScanning ? { isScanning, error: null } : { isScanning }),
      setError: (error) => set({ error, isScanning: false }),
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
      }),
    },
  ),
);

export function visibleSignals(signals: Signal[], tab: TabId): Signal[] {
  const kept = signals.filter((s) => s.kept);
  switch (tab) {
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
        .filter((s) => s.scores.typesafeLikeness >= 0.45 || s.scores.isPrimitive >= 0.55)
        .sort((a, b) => b.scores.typesafeLikeness - a.scores.typesafeLikeness);
    case "dropped":
      return signals.filter((s) => !s.kept);
    default:
      return kept;
  }
}
