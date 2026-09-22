import { pollScanJob, startScanJob } from "@/lib/signals/scan";
import { useDesk } from "@/lib/signals/store";

let generation = 0;
let wake: WakeLockSentinel | null = null;

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
  while (my === generation) {
    try {
      const snap = await pollScanJob({ data: { jobId, cursor } });
      if (my !== generation) return;
      if (!snap.ok) {
        useDesk.getState().setError(snap.error);
        dropWake();
        return;
      }
      const desk = useDesk.getState();
      desk.setLive(snap.liveStatus, snap.liveCurrent);
      for (const warning of snap.warnings) desk.addWarning(warning);
      for (const signal of snap.signals) desk.pushSignal(signal);
      cursor = snap.cursor;
      if (snap.stats) useDesk.setState({ stats: snap.stats });
      if (snap.trends.length) desk.setTrends(snap.trends);

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

  desk.beginLiveScan();
  await holdWake();

  try {
    const { jobId } = await startScanJob({
      data: { typesafeKey: key, focus, extraVoices: desk.extraVoices },
    });
    if (my !== generation) return;
    desk.setScanJobId(jobId);
    await pollUntilDone(jobId, my);
  } catch (err) {
    if (my !== generation) return;
    useDesk.getState().setError(err instanceof Error ? err.message : "Scan failed.");
    dropWake();
  }
}

export async function resumeIfNeeded() {
  const desk = useDesk.getState();
  if (!desk.scanJobId || desk.isScanning) return;
  const my = ++generation;
  desk.setScanning(true);
  desk.setLive("Resuming scan…");
  await holdWake();
  await pollUntilDone(desk.scanJobId, my);
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && useDesk.getState().isScanning) {
      void holdWake();
    }
  });
}
