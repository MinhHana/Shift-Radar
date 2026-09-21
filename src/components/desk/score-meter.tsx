import { cn } from "@/lib/utils";

export function ScoreMeter({
  label,
  value,
  compact,
}: {
  label: string;
  value: number;
  compact?: boolean;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className={cn("min-w-0", compact ? "space-y-1" : "space-y-1.5")}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="font-mono text-xs tabular-nums text-foreground">{(value * 4).toFixed(1)}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-up transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-smooth-out)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
