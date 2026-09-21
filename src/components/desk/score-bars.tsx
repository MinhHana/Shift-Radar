import { cn } from "@/lib/utils";
import type { SignalScores } from "@/lib/signals/types";

const DIMS = [
  { key: "impactCoding", label: "Code" },
  { key: "impactModels", label: "Model" },
  { key: "isNewInfo", label: "New" },
  { key: "isUnderdiscussed", label: "Hide" },
] as const;

function tone(v: number) {
  if (v >= 0.62) return "bg-up";
  if (v >= 0.38) return "bg-foreground/55";
  return "bg-down";
}

export function ScoreBars({
  scores,
  size = "md",
}: {
  scores: Pick<SignalScores, "impactCoding" | "impactModels" | "isNewInfo" | "isUnderdiscussed">;
  size?: "sm" | "md";
}) {
  const tall = size === "md" ? "h-10" : "h-7";
  const bar = size === "md" ? "w-2" : "w-1.5";
  return (
    <div className="flex items-end gap-1.5" aria-hidden="true">
      {DIMS.map((d) => {
        const v = scores[d.key];
        const pct = Math.round(Math.min(1, Math.max(0, v)) * 100);
        return (
          <div key={d.key} className="flex flex-col items-center gap-0.5">
            <div className={cn("flex items-end justify-center overflow-hidden rounded-full bg-secondary", tall, bar)}>
              <div className={cn("w-full rounded-full", tone(v))} style={{ height: `${Math.max(8, pct)}%` }} />
            </div>
            <span className="text-[10px] leading-none text-muted-foreground">{d.label[0]}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ScoreRows({
  scores,
}: {
  scores: Pick<SignalScores, "impactCoding" | "impactModels" | "isNewInfo" | "isUnderdiscussed">;
}) {
  return (
    <div className="space-y-2">
      {DIMS.map((d) => {
        const v = scores[d.key];
        const pct = Math.round(Math.min(1, Math.max(0, v)) * 100);
        return (
          <div key={d.key}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs text-muted-foreground">{d.label}</span>
              <span className="text-xs tabular-nums text-foreground">{pct}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className={cn("h-full rounded-full", tone(v))} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function emptyScores() {
  return { impactCoding: 0, impactModels: 0, isNewInfo: 0, isUnderdiscussed: 0 };
}

export function meanScores(
  list: Array<{ scores: Pick<SignalScores, "impactCoding" | "impactModels" | "isNewInfo" | "isUnderdiscussed"> }>,
) {
  if (!list.length) return emptyScores();
  const n = list.length;
  return {
    impactCoding: list.reduce((s, x) => s + x.scores.impactCoding, 0) / n,
    impactModels: list.reduce((s, x) => s + x.scores.impactModels, 0) / n,
    isNewInfo: list.reduce((s, x) => s + x.scores.isNewInfo, 0) / n,
    isUnderdiscussed: list.reduce((s, x) => s + x.scores.isUnderdiscussed, 0) / n,
  };
}
