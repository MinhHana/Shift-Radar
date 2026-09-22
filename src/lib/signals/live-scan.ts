import { sameTrends } from "@/lib/signals/live-fold";
import { getScanDesk, pollScanJob, startScanJob } from "@/lib/signals/scan";
import { useDesk } from "@/lib/signals/store";

let generation = 0;
let wake: WakeLockSentinel | null = null;
const THREE_HOURS = 3 * 60 * 60 * 1000;

async function holdWake() {
  try {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    if (document.visibilityState !== "visible") return;
    wake = await navigator.wakeLock.request("screen");
  } catch {
    wake = null;
  }
}

function dropWake() {
  void wake?.release().catch(() => {});
  wake = null;
}

async function pollUntilDone(jobId: string, my: number) {
  let cursor = 0;
  let editCursor = 0;
  while (my === generation) {
    try {
      const snap = await pollScanJob({ data: { jobId, cursor, editCursor } });
      if (my !== generation) return;
      if (!snap.ok) {
        useDesk.getState().setError(snap.error);
        dropWake();
        return;
      }
      const desk = useDesk.getState();
      desk.applyLiveChunk({
        liveStatus: snap.liveStatus,
        liveCurrent: snap.liveCurrent,
        signals: [...snap.signals, ...(snap.edits ?? [])],
        warnings: snap.warnings,
        stats: snap.stats,
      });
      cursor = snap.cursor;
      editCursor = snap.editCursor ?? editCursor;
      if (snap.trends.length && !sameTrends(desk.trends, snap.trends)) desk.setTrends(snap.trends);

      if (snap.status === "done") {
        desk.finishLiveScan();
        dropWake();
        return;
      }
      if (snap.status === "error") {
        desk.setError(snap.error || "Scan failed.");
        dropWake();
        return;
      }
    } catch {
      if (my !== generation) return;
    }
    const hidden = typeof document !== "undefined" && document.visibilityState === "hidden";
    await new Promise((ok) => setTimeout(ok, hidden ? 4000 : 1200));
  }
}

async function attachJob(jobId: string) {
  const my = ++generation;
  const desk = useDesk.getState();
  if (!desk.isScanning) desk.setScanning(true);
  desk.setScanJobId(jobId);
  await holdWake();
  await pollUntilDone(jobId, my);
}

export async function runLiveScan() {
  const desk = useDesk.getState();
  const key = desk.typesafeKey.trim();
  const focus = desk.focus;

  if (key.length < 8) {
    desk.setSettingsOpen(true);
    desk.setError("Add a TypeSafe API key before scanning.");
    return;
  }

  desk.beginLiveScan();
  const my = ++generation;
  await holdWake();

  try {
    const { jobId } = await startScanJob({
      data: { typesafeKey: key, focus, extraVoices: desk.extraVoices },
    });
    if (my !== generation) return;
    desk.setScanJobId(jobId);
    await pollUntilDone(jobId, my);
  } catch (err) {
    useDesk.getState().setError(err instanceof Error ? err.message : "Scan failed.");
    dropWake();
  }
}

export async function resumeIfNeeded() {
  const desk = useDesk.getState();
  try {
    const remote = await getScanDesk();
    if (remote.runningId) {
      if (desk.isScanning && desk.scanJobId === remote.runningId) return;
      await attachJob(remote.runningId);
      return;
    }
    if (remote.latest?.status === "done" && remote.latest.signals.length) {
      const finished = remote.latest.finishedAt ? +new Date(remote.latest.finishedAt) : 0;
      const local = desk.lastScanAt ? +new Date(desk.lastScanAt) : 0;
      if (finished > local) {
        desk.applyScan({
          signals: remote.latest.signals,
          stats: remote.latest.stats,
          warnings: remote.latest.warnings,
        });
        if (remote.latest.trends.length) desk.setTrends(remote.latest.trends);
      }
    }
  } catch {
    /* stay on local desk */
  }

  const now = useDesk.getState();
  if (now.isScanning || now.scanJobId) return;
  const last = now.lastScanAt ? +new Date(now.lastScanAt) : 0;
  if (now.typesafeKey.trim().length >= 8 && last && Date.now() - last >= THREE_HOURS) {
    await runLiveScan();
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      if (useDesk.getState().isScanning) void holdWake();
      else void resumeIfNeeded();
    }
  });
}
