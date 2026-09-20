import { cn } from "@/lib/utils";
import { TABS } from "@/lib/signals/types";
import { useDesk } from "@/lib/signals/store";

export function FilterBar() {
  const tab = useDesk((s) => s.tab);
  const setTab = useDesk((s) => s.setTab);
  const settingsOpen = useDesk((s) => s.settingsOpen);
  const setSettingsOpen = useDesk((s) => s.setSettingsOpen);

  return (
    <div className="no-scrollbar flex overflow-x-auto overscroll-x-contain border-b border-border">
      {TABS.map((t) => {
        const active = tab === t.id && !settingsOpen;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "relative h-12 shrink-0 px-4 text-sm transition-colors duration-150 hover:bg-secondary",
              active ? "font-semibold text-foreground" : "font-medium text-muted-foreground",
            )}
          >
            {t.label}
            {active ? (
              <span className="absolute inset-x-3 bottom-0 h-1 rounded-full bg-foreground" />
            ) : null}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        className={cn(
          "relative h-12 shrink-0 px-4 text-sm transition-colors duration-150 hover:bg-secondary",
          settingsOpen ? "font-semibold text-foreground" : "font-medium text-muted-foreground",
        )}
      >
        Settings
        {settingsOpen ? (
          <span className="absolute inset-x-3 bottom-0 h-1 rounded-full bg-foreground" />
        ) : null}
      </button>
    </div>
  );
}
