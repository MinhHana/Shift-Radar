import { useEffect, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { TABS } from "@/lib/signals/types";
import { useDesk } from "@/lib/signals/store";

export function FilterBar() {
  const tab = useDesk((s) => s.tab);
  const setTab = useDesk((s) => s.setTab);
  const settingsOpen = useDesk((s) => s.settingsOpen);
  const setSettingsOpen = useDesk((s) => s.setSettingsOpen);
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  const moveTo = (animate: boolean) => {
    const bar = barRef.current;
    const pill = pillRef.current;
    if (!bar || !pill) return;
    const active = bar.querySelector("[data-active='true']") as HTMLElement | null;
    if (!active) return;
    const left = active.offsetLeft + 12;
    const width = Math.max(24, active.offsetWidth - 24);
    if (!animate) {
      const prev = pill.style.transition;
      pill.style.transition = "none";
      pill.style.transform = `translateX(${left}px)`;
      pill.style.width = `${width}px`;
      void pill.offsetWidth;
      pill.style.transition = prev;
    } else {
      pill.style.transform = `translateX(${left}px)`;
      pill.style.width = `${width}px`;
    }
  };

  useLayoutEffect(() => {
    moveTo(false);
  }, [tab, settingsOpen]);

  useEffect(() => {
    const onResize = () => moveTo(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [tab, settingsOpen]);

  return (
    <div ref={barRef} className="feed-tabs no-scrollbar flex overflow-x-auto overscroll-x-contain border-b border-border">
      <span ref={pillRef} className="feed-tabs-pill" aria-hidden="true" />
      {TABS.map((t) => {
        const active = tab === t.id && !settingsOpen;
        return (
          <button
            key={t.id}
            type="button"
            data-active={active ? "true" : "false"}
            onClick={() => setTab(t.id)}
            className={cn(
              "relative h-12 shrink-0 px-4 text-sm transition-colors duration-[var(--duration-quick)] hover:bg-secondary",
              active ? "font-semibold text-foreground" : "font-medium text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        );
      })}
      <button
        type="button"
        data-active={settingsOpen ? "true" : "false"}
        onClick={() => setSettingsOpen(true)}
        className={cn(
          "relative h-12 shrink-0 px-4 text-sm transition-colors duration-[var(--duration-quick)] hover:bg-secondary",
          settingsOpen ? "font-semibold text-foreground" : "font-medium text-muted-foreground",
        )}
      >
        Settings
      </button>
    </div>
  );
}
