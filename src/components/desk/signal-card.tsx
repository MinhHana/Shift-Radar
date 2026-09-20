import { ArrowUpRight, Github } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_LABEL, ORIGIN_LABEL, type Signal } from "@/lib/signals/types";
import { formatDistanceToNowStrict } from "date-fns";

function safeAgo(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(+d)) return "";
  return formatDistanceToNowStrict(d, { addSuffix: false });
}

function initials(author: string) {
  const clean = author.replace(/^@/, "");
  return clean.slice(0, 2).toUpperCase() || "AI";
}

export function SignalCard({
  signal,
  selected,
  onSelect,
}: {
  signal: Signal;
  selected: boolean;
  onSelect: () => void;
}) {
  const handle = signal.author.startsWith("@") ? signal.author : `@${signal.author}`;
  const name = signal.author.replace(/^@/, "");

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "flex w-full gap-3 border-b border-border px-4 py-3 text-left transition-colors duration-150 hover:bg-secondary",
        selected && "bg-secondary",
        !signal.kept && "opacity-60",
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {signal.source === "github" ? <Github className="size-4" /> : initials(signal.author)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5 text-sm">
          <span className="truncate font-semibold">{name}</span>
          <span className="truncate text-muted-foreground">{handle}</span>
          <span className="text-muted-foreground">·</span>
          <span className="shrink-0 text-muted-foreground">{safeAgo(signal.createdAt)}</span>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap text-sm leading-snug text-foreground">
          {signal.text.length > 280 ? `${signal.text.slice(0, 280)}…` : signal.text}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
          <span>{ORIGIN_LABEL[signal.origin]}</span>
          <span>·</span>
          <span>{CATEGORY_LABEL[signal.category]}</span>
          {signal.scores.isUnderdiscussed >= 0.55 && (
            <>
              <span>·</span>
              <span>hidden</span>
            </>
          )}
          {signal.scores.isPrimitive >= 0.55 && (
            <>
              <span>·</span>
              <span>primitive</span>
            </>
          )}
          {signal.translated && (
            <>
              <span>·</span>
              <span>EN</span>
            </>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 font-mono text-xs tabular-nums text-muted-foreground">
          <span>Jev {Math.round(signal.composite * 100)}</span>
          <span>c {(signal.scores.impactCoding * 4).toFixed(1)}</span>
          <span>m {(signal.scores.impactModels * 4).toFixed(1)}</span>
          <span>u {(signal.scores.impactUsage * 4).toFixed(1)}</span>
          <a
            href={signal.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex h-8 items-center gap-0.5 hover:text-foreground"
          >
            Source
            <ArrowUpRight className="size-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}
