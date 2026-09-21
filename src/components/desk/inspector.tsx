import { useRef, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/desk/avatar";
import { PostImages } from "@/components/desk/post-images";
import { ScoreBars } from "@/components/desk/score-bars";
import { ScoreMeter } from "@/components/desk/score-meter";
import { AUDIENCE_LABEL, CATEGORY_LABEL, ORIGIN_LABEL, PROBLEM_LABEL, type Signal } from "@/lib/signals/types";

export function Inspector({ signal, onClose }: { signal: Signal; onClose?: () => void }) {
  const handle = signal.author.startsWith("@") ? signal.author : `@${signal.author}`;
  const name = signal.author.replace(/^@/, "");
  const jev = Math.round(signal.composite * 100);
  const start = useRef<{ x: number; y: number; axis: "h" | "v" | null } | null>(null);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY, axis: t.clientX < 36 ? "h" : null };
    setDragging(false);
  }

  function onTouchMove(e: React.TouchEvent) {
    const s = start.current;
    if (!s || !onClose) return;
    const t = e.touches[0];
    const mx = t.clientX - s.x;
    const my = t.clientY - s.y;
    if (!s.axis) {
      if (Math.abs(mx) < 12 && Math.abs(my) < 12) return;
      s.axis = Math.abs(mx) > Math.abs(my) * 1.35 && mx > 0 ? "h" : "v";
    }
    if (s.axis !== "h") return;
    setDragging(true);
    setDx(Math.max(0, mx));
  }

  function onTouchEnd() {
    const s = start.current;
    start.current = null;
    if (!onClose) return;
    if (s?.axis === "h" && dx > 72) {
      setDx(typeof window !== "undefined" ? window.innerWidth : 400);
      window.setTimeout(onClose, 140);
      return;
    }
    setDx(0);
    setDragging(false);
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col bg-background"
      style={{
        transform: `translateX(${dx}px)`,
        transition: dragging ? "none" : "transform 160ms var(--ease-smooth-out, ease)",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar source={signal.source} author={signal.author} src={signal.avatarUrl} size="sm" />
          <span className="min-w-0 truncate text-sm font-medium">{name}</span>
        </div>
        {onClose ? (
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 pb-4">
        <p className="text-sm text-muted-foreground">{handle}</p>
        <p className="mt-1 font-display text-4xl font-medium tracking-tight tabular-nums">{jev}</p>
        <p className="mt-1 text-sm text-muted-foreground">Jev impact · 0–100</p>
        <div className="mt-4">
          <ScoreBars scores={signal.scores} size="md" />
          <p className="mt-2 text-[11px] text-muted-foreground">Code · Model · New · Hide</p>
        </div>

        <p className="mt-4 text-base font-medium leading-snug break-any">{signal.soWhat || signal.reason}</p>
        <PostImages urls={signal.imageUrls} large />
        <p className="mt-5 break-any text-base leading-snug">{signal.text.slice(0, 1800)}</p>
        <p className="mt-3 break-any text-sm leading-relaxed text-muted-foreground">{signal.reason}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          {ORIGIN_LABEL[signal.origin]} · {AUDIENCE_LABEL[signal.audience]} · {CATEGORY_LABEL[signal.category]} ·{" "}
          {PROBLEM_LABEL[signal.problem]}
        </p>

        <div className="mt-5 divide-y divide-border rounded-2xl bg-secondary">
          {signal.stats.likes !== undefined && <Stat k="Likes" v={signal.stats.likes.toLocaleString()} />}
          {signal.stats.reposts !== undefined && <Stat k="Reposts" v={signal.stats.reposts.toLocaleString()} />}
          {signal.stats.stars !== undefined && <Stat k="Stars" v={signal.stats.stars.toLocaleString()} />}
          {signal.stats.forks !== undefined && <Stat k="Forks" v={signal.stats.forks.toLocaleString()} />}
          <Stat k="Jev" v={String(jev)} />
        </div>

        <div className="mt-6 space-y-3">
          <p className="text-sm font-medium">TypeSafe Jev</p>
          <ScoreMeter label="Stack shift" value={signal.scores.stackShift} />
          <ScoreMeter label="Coding" value={signal.scores.impactCoding} />
          <ScoreMeter label="Models" value={signal.scores.impactModels} />
          <ScoreMeter label="Usage" value={signal.scores.impactUsage} />
          <ScoreMeter label="Career" value={signal.scores.careerRelevance} />
          <ScoreMeter label="Novelty" value={signal.scores.novelty} />
          <ScoreMeter label="Practice shift" value={signal.scores.typesafeLikeness} />
          <ScoreMeter label="Usable this week" value={signal.scores.buildability} />
        </div>
      </div>

      <div className="p-3">
        <Button asChild className="h-11 w-full">
          <a href={signal.url} target="_blank" rel="noreferrer">
            Open original
            <ArrowUpRight />
          </a>
        </Button>
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <span className="text-sm text-muted-foreground">{k}</span>
      <span className="text-sm tabular-nums">{v}</span>
    </div>
  );
}
