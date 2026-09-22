import { useLayoutEffect, useMemo, useRef, useState, useEffect } from "react";
import { ChevronUp, Radar } from "lucide-react";
import { Avatar } from "@/components/desk/avatar";
import { Briefing } from "@/components/desk/briefing";
import { EmptyRadar } from "@/components/desk/empty-radar";
import { FilterBar } from "@/components/desk/filters";
import { FloorHero } from "@/components/desk/floor-hero";
import { Composer } from "@/components/desk/header";
import { Inspector } from "@/components/desk/inspector";
import { JevLogo } from "@/components/desk/jev-logo";
import { SettingsSheet } from "@/components/desk/settings-sheet";
import { SignalCard } from "@/components/desk/signal-card";
import { Skeleton } from "@/components/ui/skeleton";
import { resumeIfNeeded } from "@/lib/signals/live-scan";
import { useDesk, visibleSignals } from "@/lib/signals/store";

function isScanNoise(w: string) {
  return /translated \d+ non-english/i.test(w);
}

function ThemeSync() {
  const theme = useDesk((s) => s.theme);
  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#000000" : "#ffffff");
    document
      .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
      ?.setAttribute("content", theme === "dark" ? "black" : "default");
  }, [theme]);
  return null;
}

export function AppShell() {
  const signals = useDesk((s) => s.signals);
  const tab = useDesk((s) => s.tab);
  const selectedId = useDesk((s) => s.selectedId);
  const select = useDesk((s) => s.select);
  const scanning = useDesk((s) => s.isScanning);
  const error = useDesk((s) => s.error);
  const warnings = useDesk((s) => s.warnings);
  const key = useDesk((s) => s.typesafeKey);
  const lastArrivedId = useDesk((s) => s.lastArrivedId);
  const scanGen = useDesk((s) => s.scanGen);
  const firstSeen = useDesk((s) => s.firstSeen);
  const liveCurrent = useDesk((s) => s.liveCurrent);
  const trends = useDesk((s) => s.trends);
  const activeTrendId = useDesk((s) => s.activeTrendId);
  const setActiveTrend = useDesk((s) => s.setActiveTrend);

  const extraVoices = useDesk((s) => s.extraVoices);
  const activeTrend = trends.find((t) => t.id === activeTrendId) ?? null;
  const list = useMemo(
    () => visibleSignals(signals, tab, activeTrend, extraVoices),
    [signals, tab, activeTrend, extraVoices],
  );
  const selected = signals.find((s) => s.id === selectedId) ?? null;
  const visibleWarnings = warnings.filter((w) => !isScanNoise(w));
  const feedRef = useRef<HTMLElement>(null);
  const [showTop, setShowTop] = useState(false);

  const feedAnchorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const go = () => void resumeIfNeeded();
    const persist = useDesk.persist;
    if (persist.hasHydrated()) go();
    return persist.onFinishHydration(go);
  }, []);

  useEffect(() => {
    if (activeTrendId) {
      feedAnchorRef.current?.scrollIntoView({ block: "start" });
      return;
    }
    feedRef.current?.scrollTo({ top: 0 });
  }, [tab, activeTrendId]);

  return (
    <div className="phone-screen relative mx-auto flex h-dvh w-full max-w-lg flex-col bg-background text-foreground">
      <ThemeSync />
      <header className="safe-top sticky top-0 z-20 shrink-0 bg-background">
        <div className="flex h-11 items-center px-4">
          <div className="flex items-center gap-2">
            <Radar className="size-5" />
            <span className="font-display text-lg font-semibold tracking-tight">Shift Radar</span>
          </div>
        </div>
        <FilterBar />
      </header>

      <section
        ref={feedRef}
        className="feed-pad min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
        onScroll={(e) => {
          const top = e.currentTarget.scrollTop > 280;
          if (top !== showTop) setShowTop(top);
        }}
      >
        <FloorHero list={list} />
        {tab === "all" && !activeTrend ? <Briefing /> : null}
        <Composer />

        {visibleWarnings.length > 0 && (
          <div className="space-y-1 px-4 py-2">
            {visibleWarnings.map((w) => (
              <p key={w} className="break-any text-xs text-muted-foreground">
                {w}
              </p>
            ))}
          </div>
        )}
        {error ? <p className="break-any px-4 py-2 text-sm text-destructive">{error}</p> : null}

        {scanning && list.length === 0 && !liveCurrent ? (
          <div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex h-16 items-center gap-3 px-4">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        ) : list.length === 0 && !scanning ? (
          <EmptyRadar hasKey={key.trim().length >= 8} tabEmpty={signals.some((s) => s.kept)} />
        ) : (
          <div>
            <p ref={feedAnchorRef} className="px-4 pb-1 pt-2 text-sm font-medium">
              {activeTrend ? (
                <button type="button" className="text-left" onClick={() => setActiveTrend(null)}>
                  {activeTrend.title}
                  <span className="font-normal text-muted-foreground"> · {list.length} · đóng</span>
                </button>
              ) : (
                "Feed"
              )}
            </p>
            {list.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                selected={signal.id === selectedId}
                fresh={signal.id === lastArrivedId}
                scanGen={scanGen}
                firstSeen={firstSeen}
                onSelect={() => select(signal.id)}
              />
            ))}
            {scanning && liveCurrent ? (
              <div className="jev-score-row flex gap-3 border-b border-border px-4 py-3">
                <span className="relative shrink-0">
                  <Avatar source={liveCurrent.source} author={liveCurrent.author} src={liveCurrent.avatarUrl} />
                  <span className="absolute -bottom-1 -right-1">
                    <JevLogo scoring size="sm" />
                  </span>
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm font-medium">{liveCurrent.author}</p>
                  <p className="truncate text-sm text-muted-foreground">{liveCurrent.title}</p>
                  <p className="flex items-center gap-1.5 text-xs text-up">
                    <span className="font-display font-semibold">Jev</span>
                    scoring…
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {showTop && !selected ? (
        <button
          type="button"
          aria-label="Back to top"
          className="safe-bottom absolute bottom-4 right-4 z-30 flex size-11 items-center justify-center rounded-full bg-foreground text-background shadow-lg"
          onClick={() => feedRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <ChevronUp className="size-5" />
        </button>
      ) : null}

      {selected ? (
        <div className="inspector-screen phone-screen safe-top safe-bottom fixed inset-0 z-40 bg-black/25">
          <Inspector signal={selected} onClose={() => select(null)} />
        </div>
      ) : null}

      <SettingsSheet />
    </div>
  );
}
