import { memo } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/desk/avatar";
import { PostImages } from "@/components/desk/post-images";
import { useDesk } from "@/lib/signals/store";
import type { Signal } from "@/lib/signals/types";

const compactFmt = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

function compact(n?: number) {
  if (n === undefined) return null;
  return compactFmt.format(n);
}

function when(iso: string) {
  const t = +new Date(iso);
  if (!Number.isFinite(t)) return "";
  return formatDistanceToNowStrict(new Date(t), { addSuffix: true });
}

function body(signal: Signal) {
  const raw = signal.source === "github" ? signal.text : signal.text || signal.title;
  const cut = raw.replace(/\n{3,}/g, "\n\n").trim();
  if (cut.length <= 900) return cut;
  return `${cut.slice(0, 900).trim()}…`;
}

function newAge(born: number | undefined, scanGen: number) {
  if (born === undefined) return null;
  return scanGen - born;
}

const NEW_TONE: Record<number, string> = {
  0: "bg-up/15 text-up",
  1: "bg-down/15 text-down",
  2: "bg-secondary text-muted-foreground",
};

export const SignalCard = memo(function SignalCard({
  signal,
  selected,
  fresh,
  scanGen = 0,
  born,
}: {
  signal: Signal;
  selected: boolean;
  fresh?: boolean;
  scanGen?: number;
  born?: number;
}) {
  const select = useDesk((s) => s.select);
  const onSelect = () => select(signal.id);
  const handle = signal.author.startsWith("@") ? signal.author : `@${signal.author}`;
  const name = signal.source === "github" ? signal.title : handle.replace(/^@/, "");
  const jev = Math.round(signal.composite * 100);
  const age = newAge(born, scanGen);
  const newClass = age === 0 || age === 1 || age === 2 ? NEW_TONE[age] : null;
  const stats = [
    signal.source === "x" && compact(signal.stats.replies) ? `${compact(signal.stats.replies)} replies` : null,
    signal.source === "x" && compact(signal.stats.reposts) ? `${compact(signal.stats.reposts)} reposts` : null,
    signal.source === "x" && compact(signal.stats.likes) ? `${compact(signal.stats.likes)} likes` : null,
    signal.source === "x" && compact(signal.stats.views) ? `${compact(signal.stats.views)} views` : null,
    signal.source === "github" && compact(signal.stats.stars) ? `${compact(signal.stats.stars)} stars` : null,
    signal.source === "github" && compact(signal.stats.forks) ? `${compact(signal.stats.forks)} forks` : null,
    signal.language ? signal.language : null,
  ].filter(Boolean);

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
        "signal-row w-full border-b border-border px-4 py-3 text-left",
        fresh && "t-row-in",
        selected && "bg-secondary",
        !signal.kept && "opacity-50",
      )}
    >
      <div className="flex gap-3">
        <Avatar source={signal.source} author={signal.author} src={signal.avatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1.5">
                <p className="truncate text-sm font-medium">{name}</p>
                {newClass ? (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      newClass,
                    )}
                  >
                    New
                  </span>
                ) : null}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {handle}
                {signal.createdAt ? ` · ${when(signal.createdAt)}` : ""}
                {signal.source === "x" ? " · X" : " · GitHub"}
              </p>
            </div>
            <p className="shrink-0 text-xs tabular-nums text-muted-foreground">Jev {jev}</p>
          </div>
          <p className="mt-2 text-base font-medium leading-snug break-any">{signal.soWhat || signal.reason}</p>
          <p className="mt-2 whitespace-pre-wrap break-any text-sm leading-snug text-muted-foreground">{body(signal)}</p>
          <PostImages urls={signal.imageUrls} />
          {stats.length ? (
            <p className="mt-2 text-xs tabular-nums text-muted-foreground">{stats.join(" · ")}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
});
