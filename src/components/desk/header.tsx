import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runScan } from "@/lib/signals/scan";
import { useDesk } from "@/lib/signals/store";

export function Composer() {
  const focus = useDesk((s) => s.focus);
  const setFocus = useDesk((s) => s.setFocus);
  const key = useDesk((s) => s.typesafeKey);
  const scanning = useDesk((s) => s.isScanning);
  const setScanning = useDesk((s) => s.setScanning);
  const applyScan = useDesk((s) => s.applyScan);
  const setError = useDesk((s) => s.setError);
  const setSettingsOpen = useDesk((s) => s.setSettingsOpen);
  const stats = useDesk((s) => s.stats);

  async function scan() {
    if (!key.trim()) {
      setSettingsOpen(true);
      setError("Add a TypeSafe API key before scanning.");
      return;
    }
    setScanning(true);
    try {
      const res = await runScan({ data: { typesafeKey: key, focus } });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      applyScan(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed.");
    }
  }

  return (
    <div className="border-b border-border px-4 py-2 sm:py-3">
      <div className="flex items-end gap-3">
        <div className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground sm:flex">
          SR
        </div>
        <div className="min-w-0 flex-1">
          <textarea
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void scan();
              }
            }}
            placeholder="Scan signals…"
            rows={1}
            className="max-h-24 min-h-11 w-full resize-none bg-transparent text-base leading-snug text-foreground placeholder:text-muted-foreground focus-visible:outline-none sm:text-xl"
            aria-label="Scan focus"
          />
          <div className="mt-1 hidden items-center justify-between gap-3 sm:flex">
            <p className="font-mono text-xs tabular-nums text-muted-foreground">
              {stats ? `X ${stats.xFetched} · GH ${stats.githubFetched} · Jev ${stats.scored}` : "Jev scores — not likes"}
            </p>
          </div>
        </div>
        <Button onClick={() => void scan()} disabled={scanning} className="h-11 min-w-16 shrink-0 px-4">
          {scanning ? <Loader2 className="animate-spin" /> : null}
          {scanning ? "…" : "Scan"}
        </Button>
      </div>
    </div>
  );
}
