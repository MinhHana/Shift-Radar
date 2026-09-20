import { ArrowUpRight, Github, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreMeter } from "@/components/desk/score-meter";
import { AUDIENCE_LABEL, CATEGORY_LABEL, ORIGIN_LABEL, PROBLEM_LABEL, type Signal } from "@/lib/signals/types";

function initials(author: string) {
  return author.replace(/^@/, "").slice(0, 2).toUpperCase() || "AI";
}

export function Inspector({ signal, onClose }: { signal: Signal; onClose?: () => void }) {
  const handle = signal.author.startsWith("@") ? signal.author : `@${signal.author}`;
  const name = signal.author.replace(/^@/, "");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-sm font-semibold">Post</span>
        {onClose ? (
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="flex gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {signal.source === "github" ? <Github className="size-4" /> : initials(signal.author)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">{name}</p>
            <p className="truncate text-sm text-muted-foreground">{handle}</p>
          </div>
        </div>

        <p className="mt-3 whitespace-pre-wrap text-lg leading-snug">{signal.text.slice(0, 1800)}</p>

        {signal.translated ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Translated to English{signal.sourceLang && signal.sourceLang !== "en" ? ` from ${signal.sourceLang}` : ""}.
          </p>
        ) : null}

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{signal.reason}</p>

        <p className="mt-3 text-sm text-muted-foreground">
          {ORIGIN_LABEL[signal.origin]} · {AUDIENCE_LABEL[signal.audience]} · {CATEGORY_LABEL[signal.category]} ·{" "}
          {PROBLEM_LABEL[signal.problem]}
        </p>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-y border-border py-3 font-mono text-xs tabular-nums">
          {signal.stats.likes !== undefined && (
            <span>
              <strong className="text-foreground">{signal.stats.likes.toLocaleString()}</strong> likes
            </span>
          )}
          {signal.stats.reposts !== undefined && (
            <span>
              <strong className="text-foreground">{signal.stats.reposts.toLocaleString()}</strong> reposts
            </span>
          )}
          {signal.stats.stars !== undefined && (
            <span>
              <strong className="text-foreground">{signal.stats.stars.toLocaleString()}</strong> stars
            </span>
          )}
          {signal.stats.forks !== undefined && (
            <span>
              <strong className="text-foreground">{signal.stats.forks.toLocaleString()}</strong> forks
            </span>
          )}
          <span>
            <strong className="text-foreground">{Math.round(signal.composite * 100)}</strong> Jev
          </span>
        </div>

        <div className="mt-5 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">TypeSafe Jev — 0–4</p>
          <ScoreMeter label="Stack shift" value={signal.scores.stackShift} />
          <ScoreMeter label="Coding" value={signal.scores.impactCoding} />
          <ScoreMeter label="Models" value={signal.scores.impactModels} />
          <ScoreMeter label="Usage" value={signal.scores.impactUsage} />
          <ScoreMeter label="Career" value={signal.scores.careerRelevance} />
          <ScoreMeter label="Novelty" value={signal.scores.novelty} />
          <ScoreMeter label="TypeSafe-like" value={signal.scores.typesafeLikeness} />
          <ScoreMeter label="Usable this week" value={signal.scores.buildability} />
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-xs tabular-nums">
          <Row k="is_signal" v={signal.scores.isAiSignal} />
          <Row k="for_engineer" v={signal.scores.isForEngineer} />
          <Row k="new_info" v={signal.scores.isNewInfo} />
          <Row k="underdiscussed" v={signal.scores.isUnderdiscussed} />
          <Row k="primitive" v={signal.scores.isPrimitive} />
          <Row k="software_native" v={signal.scores.softwareNative} />
          <Row k="is_english" v={signal.scores.isEnglish ?? 1} />
          <Row k="confidence" v={signal.scores.confidence} />
          <Row k="composite" v={signal.composite} />
        </dl>
      </div>

      <div className="border-t border-border p-3">
        <Button asChild className="w-full">
          <a href={signal.url} target="_blank" rel="noreferrer">
            Open original
            <ArrowUpRight />
          </a>
        </Button>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: number }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd>{v.toFixed(2)}</dd>
    </div>
  );
}
