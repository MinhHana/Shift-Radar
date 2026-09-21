import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { checkTypeSafeKey } from "@/lib/signals/scan";
import { useDesk } from "@/lib/signals/store";
import { VOICES, normalizeHandle } from "@/lib/signals/voices";

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
  const theme = useDesk((s) => s.theme);
  const setTheme = useDesk((s) => s.setTheme);
  const dark = theme === "dark";
  const [draft, setDraft] = useState("");
  const [revealed, setRevealed] = useState(!armed);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [justOn, setJustOn] = useState(false);
  const [shake, setShake] = useState(false);
  const extraVoices = useDesk((s) => s.extraVoices);
  const addVoice = useDesk((s) => s.addVoice);
  const removeVoice = useDesk((s) => s.removeVoice);
  const [voiceDraft, setVoiceDraft] = useState("");
  const [voiceMsg, setVoiceMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const current = useDesk.getState().typesafeKey;
    const on = current.trim().length >= 8;
    setDraft("");
    setRevealed(!on);
    setStatus(null);
    setJustOn(false);
    setShake(false);
  }, [open]);

  const showInput = !armed || revealed;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <div className="flex h-11 items-center justify-between gap-3">
            <DialogTitle>Settings</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" aria-label="Close">
                <X />
              </Button>
            </DialogClose>
          </div>
          <DialogDescription>
            TypeSafe key stays on this device, sent to the server only when you scan, never written into code.
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-y-contain px-4 pb-6">
          <button
            type="button"
            className="flex min-h-11 items-center justify-between gap-3 text-left"
            onClick={() => setTheme(dark ? "light" : "dark")}
          >
            <p className="text-sm font-medium">Dark mode</p>
            <div
              className={cn(
                "relative h-7 w-12 rounded-full transition-colors duration-200",
                dark ? "bg-primary" : "border border-border bg-secondary",
              )}
              aria-hidden="true"
            >
              <span
                className={cn(
                  "absolute top-0.5 size-6 rounded-full bg-card shadow-sm transition-transform duration-200 ease-[var(--ease-smooth-out)]",
                  dark ? "translate-x-5" : "translate-x-0.5",
                )}
              />
            </div>
          </button>

          <div className="flex min-h-11 items-center justify-between gap-3">
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
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-secondary px-3 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span className="jev-on-dot size-2 shrink-0 rounded-full bg-primary" />
                  Jev on
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{maskKey(key)}</p>
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
                inputMode="text"
                enterKeyHint="done"
                placeholder="sk-…"
                value={draft}
                className={cn("t-input", shake && "is-shaking")}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setShake(false);
                }}
              />
              <div className="flex gap-2">
                <Button
                  className="h-11 flex-1"
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
                        setShake(false);
                        requestAnimationFrame(() => setShake(true));
                        setStatus(res.error);
                      }
                    } catch {
                      setShake(false);
                      requestAnimationFrame(() => setShake(true));
                      setStatus("Could not check the key.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? "Checking…" : "Save and check"}
                </Button>
                {armed ? (
                  <Button variant="secondary" className="h-11" onClick={() => setRevealed(false)}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </>
          )}

          {armed ? (
            <Button
              variant="secondary"
              className="h-11"
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
          <div>
            <p className="text-sm font-medium">X voices · {VOICES.length + extraVoices.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add handles to follow. Scan pulls their posts into tab Voices.
            </p>
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const handle = normalizeHandle(voiceDraft);
                const result = addVoice(voiceDraft);
                if (result === "ok") {
                  setVoiceDraft("");
                  setVoiceMsg(`Added @${handle}.`);
                  return;
                }
                if (result === "duplicate") {
                  setVoiceMsg(`@${handle} is already in the list.`);
                  return;
                }
                setVoiceMsg("Enter a valid handle.");
              }}
            >
              <Input
                value={voiceDraft}
                onChange={(e) => setVoiceDraft(e.target.value)}
                placeholder="@handle"
                autoCapitalize="none"
                autoCorrect="off"
                className="h-11"
              />
              <Button type="submit" variant="secondary" className="h-11 shrink-0 px-4">
                Add
              </Button>
            </form>
            {voiceMsg ? <p className="mt-1 text-xs text-muted-foreground">{voiceMsg}</p> : null}
            {extraVoices.length ? (
              <ul className="mt-2 space-y-1">
                {extraVoices.map((h) => (
                  <li key={h} className="flex min-h-11 items-center justify-between gap-2 text-sm">
                    <span>@{h}</span>
                    <button type="button" className="text-muted-foreground" onClick={() => removeVoice(h)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Default · {VOICES.map((v) => `@${v.handle}`).join(" · ")}
            </p>
          </div>
          <p className="break-any text-sm leading-relaxed text-muted-foreground">
            Jev scores every tweet and repo in parallel: AI signal, novelty, hidden, primitive, closed/open,
            language, problem, impact on models / coding / usage / career. Non-English posts are translated
            to English after scoring. Grok only fetches.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
