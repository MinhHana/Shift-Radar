import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/desk/avatar";
import { JevLogo } from "@/components/desk/jev-logo";
import { runLiveScan } from "@/lib/signals/live-scan";
import { useDesk } from "@/lib/signals/store";

function LiveTape() {
  const scanning = useDesk((s) => s.isScanning);
  const status = useDesk((s) => s.liveStatus);
  const current = useDesk((s) => s.liveCurrent);
  if (!scanning && !status) return null;

  return (
    <div className="mt-3 flex min-h-11 items-center gap-3 overflow-visible">
      {current ? (
        <span className="relative shrink-0">
          <Avatar source={current.source} author={current.author} src={current.avatarUrl} size="sm" />
          <span className="absolute -bottom-0.5 -right-0.5">
            <JevLogo scoring size="sm" />
          </span>
        </span>
      ) : (
        <JevLogo scoring={scanning} size="sm" />
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-jev">{status || "Scanning"}</p>
        {current ? <p className="truncate text-xs text-muted-foreground">{current.title}</p> : null}
      </div>
    </div>
  );
}

export function Composer() {
  const focus = useDesk((s) => s.focus);
  const setFocus = useDesk((s) => s.setFocus);
  const scanning = useDesk((s) => s.isScanning);
  const stats = useDesk((s) => s.stats);

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 rounded-full bg-secondary px-4">
        <textarea
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void runLiveScan();
            }
          }}
          placeholder="Search signals"
          rows={1}
          enterKeyHint="search"
          autoCapitalize="sentences"
          autoCorrect="on"
          className="max-h-24 min-h-11 w-full resize-none bg-transparent py-2.5 text-base leading-snug text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
          aria-label="Scan focus"
        />
        <Button onClick={() => void runLiveScan()} disabled={scanning} className="h-11 min-w-16 shrink-0 px-4">
          {scanning ? <JevLogo scoring size="sm" /> : null}
          {scanning ? "" : "Scan"}
        </Button>
      </div>
      <LiveTape />
      {stats ? (
        <p className="mt-2 px-1 text-xs tabular-nums text-muted-foreground">
          X {stats.xFetched} · GH {stats.githubFetched} · Jev {stats.scored}
          {stats.kept ? ` · kept ${stats.kept}` : ""}
        </p>
      ) : null}
    </div>
  );
}
