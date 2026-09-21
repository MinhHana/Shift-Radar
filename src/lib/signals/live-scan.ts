import { fetchGithubBatch, fetchXBatch, scoreOne, writeBriefing } from "@/lib/signals/scan";
import { fetchCacheKey, getCachedFetch, getCachedScore, setCachedFetch, setCachedScore } from "@/lib/signals/cache";
import { useDesk } from "@/lib/signals/store";
import type { RawItem } from "@/lib/signals/types";
import { X_LANES } from "@/lib/signals/x-lanes";

let generation = 0;

export async function runLiveScan() {
  const my = ++generation;
  const desk = useDesk.getState();
  const key = desk.typesafeKey.trim();
  const focus = desk.focus;

  if (key.length < 8) {
    desk.setSettingsOpen(true);
    desk.setError("Add a TypeSafe API key before scanning.");
    return;
  }

  const extraVoices = desk.extraVoices;
  desk.beginLiveScan();
  const queue: RawItem[] = [];
  const seen = new Set<string>();
  let busy = false;
  let cacheHits = 0;

  const stale = () => my !== generation || !useDesk.getState().isScanning;

  async function drain() {
    if (busy) return;
    busy = true;
    try {
      while (queue.length) {
        if (stale()) return;
        const item = queue.shift();
        if (!item) break;
        const cached = getCachedScore(item);
        if (cached) {
          cacheHits += 1;
          useDesk.getState().pushSignal(cached);
          continue;
        }
        const label = item.author || item.title;
        useDesk.getState().setLive(`Jev scoring ${label}`, {
          author: item.author,
          title: item.title,
          source: item.source,
          avatarUrl: item.avatarUrl,
        });
        const res = await scoreOne({ data: { typesafeKey: key, item } });
        if (stale()) return;
        if (!res.ok) {
          useDesk.getState().addWarning("Jev skipped one item.");
          continue;
        }
        setCachedScore(res.signal);
        useDesk.getState().pushSignal(res.signal);
        const ticker = res.signal.author.replace(/^@/, "").slice(0, 8);
        useDesk.getState().setLive(
          res.signal.kept
            ? `Kept ${(res.signal.composite * 100).toFixed(0)} · ${ticker}`
            : `Dropped · ${ticker}`,
          {
            author: res.signal.author,
            title: res.signal.title,
            source: res.signal.source,
            avatarUrl: res.signal.avatarUrl,
          },
        );
      }
    } finally {
      busy = false;
      if (queue.length && !stale()) await drain();
    }
  }

  async function ingest(source: "x" | "github", items: RawItem[], warning?: string) {
    if (stale()) return;
    const fresh = items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    useDesk.getState().bumpFetched(source, fresh.length);
    if (warning) useDesk.getState().addWarning(warning);
    queue.push(...fresh);
    await drain();
  }

  useDesk.getState().setLive("Briefing X + GitHub · cache first…");

  async function githubPull() {
    const ck = fetchCacheKey("gh", focus);
    const hit = getCachedFetch(ck);
    if (hit?.length) {
      useDesk.getState().setLive(`GitHub cache · ${hit.length}`);
      await ingest("github", hit);
      return;
    }
    try {
      const r = await fetchGithubBatch({ data: { focus } });
      if (stale()) return;
      if (r.items.length) setCachedFetch(ck, r.items);
      useDesk.getState().setLive(`GitHub ${r.items.length} · Jev`);
      await ingest("github", r.items, r.warning);
    } catch {
      if (!stale()) useDesk.getState().addWarning("GitHub pull failed.");
    }
  }

  const xPs = (async () => {
    const pending = [...X_LANES];
    const workers = 2;
    async function worker() {
      while (pending.length) {
        if (stale()) return;
        const lane = pending.shift();
        if (!lane) return;
        const ck = fetchCacheKey(`x:${lane.id}`, `${focus}|${extraVoices.join(",")}`);
        const hit = getCachedFetch(ck);
        if (hit?.length) {
          useDesk.getState().setLive(`X ${lane.label} cache · ${hit.length}`);
          await ingest("x", hit);
          continue;
        }
        let lastErr = "";
        for (let attempt = 0; attempt < 2; attempt++) {
          if (stale()) return;
          try {
            const r = await fetchXBatch({
              data: { focus, window: "recent", lane: lane.id, extraVoices },
            });
            if (stale()) return;
            if (r.items.length) setCachedFetch(ck, r.items);
            useDesk.getState().setLive(`X ${lane.label} · ${r.items.length}`);
            await ingest("x", r.items, r.warning ? `X ${lane.label}: ${r.warning}` : undefined);
            lastErr = "";
            break;
          } catch (err) {
            lastErr = err instanceof Error ? err.message : "failed";
            if (attempt === 0) await new Promise((ok) => setTimeout(ok, 800));
          }
        }
        if (lastErr && !stale()) useDesk.getState().addWarning(`X ${lane.label}: ${lastErr}`);
      }
    }
    await Promise.all(Array.from({ length: workers }, () => worker()));
  })();

  await Promise.all([githubPull(), xPs]);
  if (stale()) return;
  await drain();
  if (stale()) return;

  const { stats } = useDesk.getState();
  if (!stats?.scored && !useDesk.getState().signals.length) {
    useDesk.getState().setError(useDesk.getState().warnings[0] || "No signals this scan.");
    return;
  }
  useDesk.getState().setLive(
    cacheHits ? `Done · ${stats?.kept ?? 0} kept · ${cacheHits} cached` : `Done · ${stats?.kept ?? 0} kept`,
  );

  const top = [...useDesk.getState().signals]
    .filter((s) => s.kept)
    .sort((a, b) => b.composite - a.composite)
    .slice(0, 28);
  if (top.length) {
    useDesk.getState().setLive("Tóm tắt xu hướng…");
    try {
      const brief = await writeBriefing({
        data: {
          items: top.map((s) => ({
            id: s.id,
            soWhat: s.soWhat || s.reason,
            title: s.title,
            author: s.author,
            composite: s.composite,
            source: s.source,
            problem: s.problem,
          })),
        },
      });
      if (!stale() && brief.trends.length) useDesk.getState().setTrends(brief.trends);
    } catch {
      /* keep previous trends */
    }
  }

  if (stale()) return;
  useDesk.getState().finishLiveScan();
}
