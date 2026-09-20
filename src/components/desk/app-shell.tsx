import { useMemo } from "react";
import { Radar } from "lucide-react";
import { EmptyRadar } from "@/components/desk/empty-radar";
import { FilterBar } from "@/components/desk/filters";
import { Composer } from "@/components/desk/header";
import { Inspector } from "@/components/desk/inspector";
import { SettingsSheet } from "@/components/desk/settings-sheet";
import { SideNav } from "@/components/desk/side-nav";
import { SignalCard } from "@/components/desk/signal-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDesk, visibleSignals } from "@/lib/signals/store";

export function AppShell() {
  const signals = useDesk((s) => s.signals);
  const tab = useDesk((s) => s.tab);
  const selectedId = useDesk((s) => s.selectedId);
  const select = useDesk((s) => s.select);
  const scanning = useDesk((s) => s.isScanning);
  const error = useDesk((s) => s.error);
  const warnings = useDesk((s) => s.warnings);
  const key = useDesk((s) => s.typesafeKey);

  const list = useMemo(() => visibleSignals(signals, tab), [signals, tab]);
  const selected = signals.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="flex h-dvh max-w-full overflow-hidden bg-background text-foreground">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 overflow-hidden">
        <SideNav />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-border md:max-w-xl">
          <header className="shrink-0 bg-background">
            <div className="flex h-11 items-center px-4 md:hidden">
              <div className="flex items-center gap-2">
                <Radar className="size-5" />
                <span className="font-display text-lg font-semibold tracking-tight">Shift Radar</span>
              </div>
            </div>
            <div className="hidden h-12 items-center px-4 md:flex">
              <h1 className="font-display text-lg font-semibold tracking-tight">Home</h1>
            </div>
            <FilterBar />
          </header>

          <Composer />

          {(error || warnings.length > 0) && (
            <div className="shrink-0 space-y-1 border-b border-border px-4 py-2">
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              {warnings.map((w) => (
                <p key={w} className="text-xs text-muted-foreground">
                  {w}
                </p>
              ))}
            </div>
          )}

          <section className="feed-pad min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
            {scanning ? (
              <div>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3 border-b border-border px-4 py-3">
                    <Skeleton className="size-10 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : list.length === 0 ? (
              <EmptyRadar hasKey={key.trim().length >= 8} />
            ) : (
              list.map((signal) => (
                <SignalCard
                  key={signal.id}
                  signal={signal}
                  selected={signal.id === selectedId}
                  onSelect={() => select(signal.id)}
                />
              ))
            )}
          </section>
        </main>

        <aside className="hidden min-h-0 w-96 shrink-0 overflow-hidden lg:block">
          {selected ? (
            <Inspector signal={selected} />
          ) : (
            <div className="px-6 py-16">
              <p className="font-display text-2xl font-medium tracking-tight">Jev.</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Pick a post. TypeSafe shows noul, scores, closed/open — no essays.
              </p>
            </div>
          )}
        </aside>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-40 bg-background pt-[env(safe-area-inset-top)] lg:hidden">
          <Inspector signal={selected} onClose={() => select(null)} />
        </div>
      ) : null}

      <SettingsSheet />
    </div>
  );
}
