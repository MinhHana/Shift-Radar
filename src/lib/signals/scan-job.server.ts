import { fetchGithubSignals } from "./github.server";
import { writeVietnameseTrends } from "./briefing.server";
import { needsTranslation, translateOne } from "./translate.server";
import { probeTypeSafe, scoreItem } from "./typesafe.server";
import type { Signal, SourceKind, Trend } from "./types";
import { fetchXSignals } from "./x.server";
import { X_LANES } from "./x-lanes";

export type ScanJobSnap = {
  id: string;
  status: "running" | "done" | "error";
  liveStatus: string;
  liveCurrent: { author: string; title: string; source: SourceKind; avatarUrl?: string } | null;
  signals: Signal[];
  stats: { xFetched: number; githubFetched: number; scored: number; kept: number };
  warnings: string[];
  trends: Trend[];
  error?: string;
};

const jobs = new Map<string, ScanJobSnap>();

function job(id: string): ScanJobSnap {
  const j = jobs.get(id);
  if (!j) throw new Error("Scan job missing.");
  return j;
}

export function getScanJob(id: string): ScanJobSnap | null {
  return jobs.get(id) ?? null;
}

export function startScanJob(input: {
  typesafeKey: string;
  focus?: string;
  extraVoices?: string[];
}): string {
  const id = crypto.randomUUID();
  jobs.set(id, {
    id,
    status: "running",
    liveStatus: "Pulling sources…",
    liveCurrent: null,
    signals: [],
    stats: { xFetched: 0, githubFetched: 0, scored: 0, kept: 0 },
    warnings: [],
    trends: [],
  });
  void runJob(id, input).catch((err) => {
    const j = jobs.get(id);
    if (!j || j.status !== "running") return;
    j.status = "error";
    j.error = err instanceof Error ? err.message : "Scan failed.";
  });
  return id;
}

async function scoreOneSafe(key: string, item: Parameters<typeof scoreItem>[1]): Promise<Signal | null> {
  try {
    let signal = await scoreItem(key, item);
    if (needsTranslation(`${signal.title}\n${signal.text}`, signal.scores.isEnglish)) {
      signal = await translateOne(signal);
    }
    return signal;
  } catch {
    return null;
  }
}

async function runJob(
  id: string,
  input: { typesafeKey: string; focus?: string; extraVoices?: string[] },
) {
  const j = job(id);
  const key = input.typesafeKey.trim();
  const focus = input.focus?.trim() || undefined;
  const extraVoices = input.extraVoices ?? [];

  const probe = await probeTypeSafe(key);
  if (!probe.ok) {
    j.status = "error";
    j.error = probe.error;
    return;
  }

  const seen = new Set<string>();
  const queue: Parameters<typeof scoreItem>[1][] = [];
  let scoring = false;

  async function drain() {
    if (scoring) return;
    scoring = true;
    try {
      while (queue.length) {
        const item = queue.shift();
        if (!item) break;
        j.liveStatus = `Jev scoring ${item.author || item.title}`;
        j.liveCurrent = {
          author: item.author,
          title: item.title,
          source: item.source,
          avatarUrl: item.avatarUrl,
        };
        const signal = await scoreOneSafe(key, item);
        if (!signal) {
          j.warnings.push("Jev skipped one item.");
          continue;
        }
        j.signals = [...j.signals.filter((s) => s.id !== signal.id), signal];
        j.stats = {
          ...j.stats,
          scored: j.stats.scored + 1,
          kept: j.signals.filter((s) => s.kept).length,
        };
        const ticker = signal.author.replace(/^@/, "").slice(0, 8);
        j.liveStatus = signal.kept
          ? `Kept ${(signal.composite * 100).toFixed(0)} · ${ticker}`
          : `Dropped · ${ticker}`;
      }
    } finally {
      scoring = false;
      if (queue.length) await drain();
    }
  }

  async function ingest(
    source: "x" | "github",
    items: Parameters<typeof scoreItem>[1][],
    warning?: string,
  ) {
    const fresh = items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    j.stats = {
      ...j.stats,
      xFetched: j.stats.xFetched + (source === "x" ? fresh.length : 0),
      githubFetched: j.stats.githubFetched + (source === "github" ? fresh.length : 0),
    };
    if (warning) j.warnings.push(warning);
    queue.push(...fresh);
    await drain();
  }

  j.liveStatus = "Briefing X + GitHub…";

  const githubPull = (async () => {
    try {
      const r = await fetchGithubSignals(focus);
      j.liveStatus = `GitHub ${r.items.length} · Jev`;
      await ingest("github", r.items, r.warning);
    } catch {
      j.warnings.push("GitHub pull failed.");
    }
  })();

  const xPull = (async () => {
    const pending = [...X_LANES];
    async function worker() {
      while (pending.length) {
        const lane = pending.shift();
        if (!lane) return;
        let lastErr = "";
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const r = await fetchXSignals(focus, "recent", lane.id, extraVoices);
            if (r.items.length) {
              j.liveStatus = `X ${lane.label} · ${r.items.length}`;
              await ingest("x", r.items, r.warning ? `X ${lane.label}: ${r.warning}` : undefined);
              lastErr = "";
              break;
            }
            lastErr = r.warning || "empty";
          } catch (err) {
            lastErr = err instanceof Error ? err.message : "failed";
            if (attempt === 0) await new Promise((ok) => setTimeout(ok, 800));
          }
        }
        if (lastErr) j.warnings.push(`X ${lane.label}: ${lastErr}`);
      }
    }
    await Promise.all([worker(), worker()]);
  })();

  await Promise.all([githubPull, xPull]);
  await drain();

  if (!j.stats.scored && !j.signals.length) {
    j.status = "error";
    j.error = j.warnings[0] || "No signals this scan.";
    return;
  }

  const top = [...j.signals]
    .filter((s) => s.kept)
    .sort((a, b) => b.composite - a.composite)
    .slice(0, 28);
  if (top.length) {
    j.liveStatus = "Tóm tắt xu hướng…";
    j.liveCurrent = null;
    try {
      j.trends = await writeVietnameseTrends(
        top.map((s) => ({
          id: s.id,
          soWhat: s.soWhat || s.reason,
          title: s.title,
          author: s.author,
          composite: s.composite,
          source: s.source,
          problem: s.problem,
        })),
      );
    } catch {
      /* keep empty trends */
    }
  }

  j.liveStatus = `Done · ${j.stats.kept} kept`;
  j.liveCurrent = null;
  j.status = "done";

  setTimeout(() => jobs.delete(id), 30 * 60 * 1000);
}
