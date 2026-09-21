import {
  Ban,
  Box,
  Clock,
  Crown,
  EyeOff,
  FlaskConical,
  Github,
  Hexagon,
  House,
  Mic,
  Radar,
  Settings2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TABS, type TabId } from "@/lib/signals/types";
import { useDesk } from "@/lib/signals/store";

const ICONS: Record<TabId, typeof House> = {
  all: House,
  founders: Crown,
  hidden: EyeOff,
  impact: Zap,
  new: Clock,
  research: FlaskConical,
  repo: Github,
  product: Box,
  kin: Hexagon,
  voices: Mic,
  dropped: Ban,
};

export function SideNav() {
  const tab = useDesk((s) => s.tab);
  const setTab = useDesk((s) => s.setTab);
  const setSettingsOpen = useDesk((s) => s.setSettingsOpen);

  return (
    <nav className="sticky top-0 hidden h-dvh w-20 shrink-0 flex-col border-r border-border px-2 py-3 md:flex xl:w-56 xl:px-3">
      <div className="flex h-12 items-center gap-2 px-2">
        <Radar className="size-7" strokeWidth={1.75} />
        <span className="hidden font-display text-xl font-semibold tracking-tight xl:inline">Shift Radar</span>
      </div>
      <ul className="mt-4 flex flex-1 flex-col gap-1">
        {TABS.map((t) => {
          const Icon = ICONS[t.id];
          const active = tab === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex h-12 w-full items-center gap-4 rounded-full px-3 text-lg transition-colors duration-150 hover:bg-secondary",
                  active ? "font-semibold" : "font-normal",
                )}
              >
                <Icon className="size-6 shrink-0" strokeWidth={active ? 2.25 : 1.75} />
                <span className="hidden xl:inline">{t.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        className="flex h-12 w-full items-center gap-4 rounded-full px-3 text-lg hover:bg-secondary"
      >
        <Settings2 className="size-6 shrink-0" strokeWidth={1.75} />
        <span className="hidden xl:inline">Settings</span>
      </button>
    </nav>
  );
}
