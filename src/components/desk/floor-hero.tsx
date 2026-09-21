import { meanScores } from "@/components/desk/score-bars";
import { cn } from "@/lib/utils";
import { useDesk } from "@/lib/signals/store";
import type { Signal } from "@/lib/signals/types";
import { formatDistanceToNowStrict } from "date-fns";

function chip(label: string, value: number) {
  const tone = value >= 62 ? "text-up" : value >= 38 ? "text-foreground" : "text-down";
  return (
    <span className="tabular-nums">
      <span className="text-muted-foreground">{label} </span>
      <span className={cn("font-medium", tone)}>{value}</span>
    </span>
  );
}

export function FloorHero({ list }: { list: Signal[] }) {
  const lastScanAt = useDesk((s) => s.lastScanAt);
  const kept = list.filter((s) => s.kept);
  const avg = kept.length ? kept.reduce((n, s) => n + s.composite, 0) / kept.length : 0;
  const jev = Math.round(avg * 100);
  const m = meanScores(kept);
  const scanned =
    lastScanAt && !Number.isNaN(+new Date(lastScanAt))
      ? formatDistanceToNowStrict(new Date(lastScanAt), { addSuffix: true })
      : null;

  return (
    <div className="flex items-end justify-between gap-3 px-4 pb-2 pt-3">
      <div className="min-w-0">
        <p className="font-display text-3xl font-medium tracking-tight tabular-nums leading-none">{jev}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          Jev · {kept.length} kept{scanned ? ` · ${scanned}` : ""}
        </p>
      </div>
      {kept.length ? (
        <p className="shrink-0 text-right text-xs leading-5">
          {chip("Code", Math.round(m.impactCoding * 100))}
          {" · "}
          {chip("Model", Math.round(m.impactModels * 100))}
          <br />
          {chip("New", Math.round(m.isNewInfo * 100))}
          {" · "}
          {chip("Hide", Math.round(m.isUnderdiscussed * 100))}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">No kept yet</p>
      )}
    </div>
  );
}
