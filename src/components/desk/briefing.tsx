import { useState } from "react";
import { cn } from "@/lib/utils";
import { explainTrend } from "@/lib/signals/scan";
import { useDesk } from "@/lib/signals/store";

export function Briefing() {
  const trends = useDesk((s) => s.trends);
  const signals = useDesk((s) => s.signals);
  const activeTrendId = useDesk((s) => s.activeTrendId);
  const setActiveTrend = useDesk((s) => s.setActiveTrend);
  const notes = useDesk((s) => s.trendNotes);
  const explainingId = useDesk((s) => s.explainingTrendId);
  const setNote = useDesk((s) => s.setTrendNote);
  const setExplaining = useDesk((s) => s.setExplainingTrend);
  const briefing = useDesk((s) => s.briefing);
  const [openGrokId, setOpenGrokId] = useState<string | null>(null);

  async function askGrok(trendId: string, title: string, ids: string[]) {
    if (notes[trendId]) {
      setOpenGrokId((cur) => (cur === trendId ? null : trendId));
      return;
    }
    const posts = ids
      .map((id) => signals.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .slice(0, 8)
      .map((s) => ({
        author: s.author,
        soWhat: s.soWhat || s.reason,
        title: s.title,
        text: s.text,
      }));
    setExplaining(trendId);
    setOpenGrokId(trendId);
    try {
      const res = await explainTrend({ data: { title, posts } });
      if (res.text) setNote(trendId, res.text);
    } finally {
      setExplaining(null);
    }
  }

  if (trends.length) {
    return (
      <div className="px-4 pb-3">
        <p className="text-xs font-medium text-jev">10 xu hướng</p>
        <ol className="mt-1.5 space-y-1">
          {trends.slice(0, 10).map((trend, i) => {
            const on = trend.id === activeTrendId;
            const note = notes[trend.id];
            const loading = explainingId === trend.id;
            const grokOpen = openGrokId === trend.id && Boolean(note || loading);
            return (
              <li key={trend.id}>
                <div className="flex items-start gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenGrokId(null);
                      setActiveTrend(on ? null : trend.id);
                    }}
                    className={cn(
                      "flex min-h-11 min-w-0 flex-1 gap-2 py-1.5 text-left text-sm leading-snug text-jev",
                      on && "font-medium",
                    )}
                  >
                    <span className="w-4 shrink-0 tabular-nums text-jev">{i + 1}.</span>
                    <span className="min-w-0 flex-1 break-any">
                      {trend.title}
                      <span className="opacity-60"> · {trend.signalIds.length}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label="Grok giải thích"
                    className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full"
                    onClick={() => askGrok(trend.id, trend.title, trend.signalIds)}
                  >
                    <span
                      className={cn(
                        "font-display text-base font-semibold leading-none text-jev",
                        loading && "animate-pulse",
                        grokOpen && "underline",
                      )}
                    >
                      G
                    </span>
                  </button>
                </div>
                {grokOpen && loading ? (
                  <p className="pb-2 pl-6 text-xs text-muted-foreground">Grok đang giải thích…</p>
                ) : null}
                {grokOpen && note ? (
                  <p className="whitespace-pre-wrap break-any pb-2 pl-6 text-sm leading-snug text-muted-foreground">
                    {note}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  if (!briefing.length) return null;
  return (
    <div className="px-4 pb-3">
      <p className="text-xs font-medium text-jev">Lần này</p>
      <ul className="mt-1.5 space-y-1.5">
        {briefing.slice(0, 10).map((line) => (
          <li key={line} className="flex gap-2 text-sm leading-snug text-jev">
            <span className="mt-2 size-1 shrink-0 rounded-full bg-jev" />
            <span className="min-w-0 break-any">{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
