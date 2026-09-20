import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { checkTypeSafeKey } from "@/lib/signals/scan";
import { useDesk } from "@/lib/signals/store";

function maskKey(key: string) {
  const t = key.trim();
  if (t.length < 8) return "••••••••";
  return `${t.slice(0, 3)}••••${t.slice(-4)}`;
}

export function SettingsSheet() {
  const open = useDesk((s) => s.settingsOpen);
  const setOpen = useDesk((s) => s.setSettingsOpen);
  const key = useDesk((s) => s.typesafeKey);
  const setKey = useDesk((s) => s.setKey);
  const armed = key.trim().length >= 8;
  const [draft, setDraft] = useState("");
  const [revealed, setRevealed] = useState(!armed);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [justOn, setJustOn] = useState(false);

  useEffect(() => {
    if (!open) return;
    const current = useDesk.getState().typesafeKey;
    const on = current.trim().length >= 8;
    setDraft("");
    setRevealed(!on);
    setStatus(null);
    setJustOn(false);
  }, [open]);

  const showInput = !armed || revealed;

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            TypeSafe key stays on this device, sent to the server only when you scan, never written into code.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-5 pb-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">TypeSafe / Jev</p>
            <div
              className={cn(
                "relative h-7 w-12 rounded-full transition-colors duration-200",
                armed ? "bg-primary" : "border border-border bg-secondary",
                justOn && "jev-on-pop",
              )}
              aria-hidden="true"
            >
              <span
                className={cn(
                  "absolute top-0.5 size-6 rounded-full bg-card shadow-sm transition-transform duration-200 ease-[var(--ease-smooth-out)]",
                  armed ? "translate-x-5" : "translate-x-0.5",
                )}
              />
            </div>
          </div>

          {armed && !showInput ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary px-3 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span className="jev-on-dot size-2 shrink-0 rounded-full bg-primary" />
                  Jev on
                </p>
                <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{maskKey(key)}</p>
              </div>
              <Button
                variant="secondary"
                className="shrink-0"
                onClick={() => {
                  setRevealed(true);
                  setDraft("");
                  setStatus(null);
                }}
              >
                Change
              </Button>
            </div>
          ) : (
            <>
              <label className="text-sm font-medium" htmlFor="ts-key">
                TypeSafe API key
              </label>
              <Input
                id="ts-key"
                type="password"
                autoComplete="off"
                placeholder="sk-…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={busy || draft.trim().length < 8}
                  onClick={async () => {
                    setBusy(true);
                    setStatus(null);
                    try {
                      const res = await checkTypeSafeKey({ data: { typesafeKey: draft } });
                      if (res.ok) {
                        setKey(draft.trim());
                        setDraft("");
                        setRevealed(false);
                        setJustOn(true);
                        setStatus("Jev is on.");
                      } else {
                        setStatus(res.error);
                      }
                    } catch {
                      setStatus("Could not check the key.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? "Checking…" : "Save and check"}
                </Button>
                {armed ? (
                  <Button variant="secondary" onClick={() => setRevealed(false)}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </>
          )}

          {armed ? (
            <Button
              variant="secondary"
              onClick={() => {
                setDraft("");
                setKey("");
                setRevealed(true);
                setJustOn(false);
                setStatus("Jev off. Key removed from this device.");
              }}
            >
              Turn off
            </Button>
          ) : null}

          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
          <p className="text-sm leading-relaxed text-muted-foreground">
            Jev scores every tweet and repo in parallel: AI signal, novelty, hidden, primitive, closed/open,
            language, problem, impact on models / coding / usage / career. Non-English posts are translated
            to English after scoring. Grok only fetches.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
