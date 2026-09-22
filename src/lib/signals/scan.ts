import { createServerFn } from "@tanstack/react-start";
import type { RawItem, ScanError, ScanResult, Signal } from "./types";

export const runScan = createServerFn({ method: "POST" })
  .validator((data: { typesafeKey: string; focus?: string }) => {
    if (!data || typeof data.typesafeKey !== "string") {
      throw new Error("TypeSafe API key required.");
    }
    return {
      typesafeKey: data.typesafeKey.trim(),
      focus: typeof data.focus === "string" ? data.focus.trim() : "",
    };
  })
  .handler(async ({ data }): Promise<ScanResult | ScanError> => {
    const { executeScan } = await import("./scan-impl.server.ts");
    return executeScan({
      typesafeKey: data.typesafeKey,
      focus: data.focus || undefined,
    });
  });

export const checkTypeSafeKey = createServerFn({ method: "POST" })
  .validator((data: { typesafeKey: string }) => {
    if (!data || typeof data.typesafeKey !== "string") {
      throw new Error("TypeSafe API key required.");
    }
    return { typesafeKey: data.typesafeKey.trim() };
  })
  .handler(async ({ data }) => {
    const { probeTypeSafe } = await import("./typesafe.server.ts");
    return probeTypeSafe(data.typesafeKey);
  });

export const fetchGithubBatch = createServerFn({ method: "POST" })
  .validator((data: { focus?: string }) => ({
    focus: typeof data?.focus === "string" ? data.focus.trim() : "",
  }))
  .handler(async ({ data }): Promise<{ items: RawItem[]; warning?: string }> => {
    const { fetchGithubSignals } = await import("./github.server.ts");
    return fetchGithubSignals(data.focus || undefined);
  });

export const fetchXBatch = createServerFn({ method: "POST" })
  .validator((data: { focus?: string; window?: "recent" | "quarter"; lane?: string; extraVoices?: string[] }) => ({
    focus: typeof data?.focus === "string" ? data.focus.trim() : "",
    window: data?.window === "quarter" ? ("quarter" as const) : ("recent" as const),
    lane: typeof data?.lane === "string" ? data.lane : "",
    extraVoices: Array.isArray(data?.extraVoices)
      ? data.extraVoices.filter((h): h is string => typeof h === "string").slice(0, 40)
      : [],
  }))
  .handler(async ({ data }): Promise<{ items: RawItem[]; warning?: string }> => {
    const { fetchXSignals } = await import("./x.server.ts");
    return fetchXSignals(data.focus || undefined, data.window, data.lane || undefined, data.extraVoices);
  });

export const scoreOne = createServerFn({ method: "POST" })
  .validator((data: { typesafeKey: string; item: RawItem }) => {
    if (!data || typeof data.typesafeKey !== "string" || !data.item) {
      throw new Error("TypeSafe API key and item required.");
    }
    return { typesafeKey: data.typesafeKey.trim(), item: data.item };
  })
  .handler(async ({ data }): Promise<{ ok: true; signal: Signal } | { ok: false; error: string }> => {
    const { scoreItem } = await import("./typesafe.server.ts");
    const { needsTranslation, translateOne } = await import("./translate.server.ts");
    try {
      let signal = await scoreItem(data.typesafeKey, data.item);
      if (needsTranslation(`${signal.title}\n${signal.text}`, signal.scores.isEnglish)) {
        signal = await translateOne(signal);
      }
      return { ok: true, signal };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Jev failed." };
    }
  });

export const writeBriefing = createServerFn({ method: "POST" })
  .validator(
    (data: {
      items: Array<{
        id: string;
        soWhat: string;
        title: string;
        author: string;
        composite: number;
        source: string;
        problem?: string;
      }>;
    }) => ({
      items: Array.isArray(data?.items) ? data.items.slice(0, 40) : [],
    }),
  )
  .handler(async ({ data }): Promise<{ trends: import("./types").Trend[] }> => {
    const { writeVietnameseTrends } = await import("./briefing.server.ts");
    const trends = await writeVietnameseTrends(data.items);
    return { trends };
  });

export const explainTrend = createServerFn({ method: "POST" })
  .validator(
    (data: {
      title: string;
      posts: Array<{ author: string; soWhat: string; title: string; text: string }>;
    }) => ({
      title: typeof data?.title === "string" ? data.title : "",
      posts: Array.isArray(data?.posts) ? data.posts.slice(0, 8) : [],
    }),
  )
  .handler(async ({ data }): Promise<{ text: string }> => {
    const { explainTrendInVietnamese } = await import("./briefing.server.ts");
    const text = await explainTrendInVietnamese(data);
    return { text };
  });

export const startScanJob = createServerFn({ method: "POST" })
  .validator(
    (data: { typesafeKey: string; focus?: string; extraVoices?: string[] }) => {
      if (!data || typeof data.typesafeKey !== "string") {
        throw new Error("TypeSafe API key required.");
      }
      return {
        typesafeKey: data.typesafeKey.trim(),
        focus: typeof data.focus === "string" ? data.focus.trim() : "",
        extraVoices: Array.isArray(data.extraVoices)
          ? data.extraVoices.filter((h): h is string => typeof h === "string").slice(0, 40)
          : [],
      };
    },
  )
  .handler(async ({ data }): Promise<{ jobId: string }> => {
    const { startScanJob: start } = await import("./scan-job.server.ts");
    const jobId = start({
      typesafeKey: data.typesafeKey,
      focus: data.focus || undefined,
      extraVoices: data.extraVoices,
    });
    return { jobId };
  });

export const pollScanJob = createServerFn({ method: "POST" })
  .validator((data: { jobId: string; cursor?: number }) => ({
    jobId: typeof data?.jobId === "string" ? data.jobId : "",
    cursor: typeof data?.cursor === "number" ? Math.max(0, data.cursor) : 0,
  }))
  .handler(async ({ data }) => {
    const { getScanJob } = await import("./scan-job.server.ts");
    const job = getScanJob(data.jobId);
    if (!job) return { ok: false as const, error: "Scan job expired." };
    return {
      ok: true as const,
      status: job.status,
      liveStatus: job.liveStatus,
      liveCurrent: job.liveCurrent,
      signals: job.signals.slice(data.cursor),
      cursor: job.signals.length,
      stats: job.stats,
      warnings: job.warnings,
      trends: job.trends,
      error: job.error,
    };
  });

export const getScanDesk = createServerFn({ method: "POST" }).handler(async () => {
  const { getScanDesk: desk } = await import("./scan-job.server.ts");
  const snap = desk();
  return {
    runningId: snap.runningId,
    nextAutoAt: snap.nextAutoAt,
    latest: snap.latest
      ? {
          id: snap.latest.id,
          status: snap.latest.status,
          liveStatus: snap.latest.liveStatus,
          signals: snap.latest.signals,
          stats: snap.latest.stats,
          warnings: snap.latest.warnings,
          trends: snap.latest.trends,
          finishedAt: snap.latest.finishedAt,
        }
      : null,
  };
});
