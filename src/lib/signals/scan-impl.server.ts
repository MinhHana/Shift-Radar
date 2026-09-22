import { fetchGithubSignals } from "./github.server";
import { writeCachedScore } from "./score-cache.server";
import { afterJev } from "./after-jev";
import { polishSoWhat, probeTypeSafe, scoreAll } from "./typesafe.server";
import { needsTranslation, translateOne } from "./translate.server";
import { fetchXSignals } from "./x.server";
import type { ScanError, ScanResult, Signal } from "./types";

async function settleKept(signals: Signal[]): Promise<Signal[]> {
  const pending = signals.filter((signal) => {
    const plan = afterJev(signal, needsTranslation(`${signal.title}\n${signal.text}`, signal.scores.isEnglish));
    return plan.translate || plan.polish;
  });
  const done = new Map<string, Signal>();
  const workers = pending.length ? Math.min(4, pending.length) : 0;

  async function worker() {
    while (pending.length) {
      const signal = pending.shift();
      if (!signal) return;
      const plan = afterJev(
        signal,
        needsTranslation(`${signal.title}\n${signal.text}`, signal.scores.isEnglish),
      );
      let next = signal;
      if (plan.translate) next = await translateOne(next);
      if (plan.polish) next = await polishSoWhat(next);
      done.set(signal.id, next);
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()));
  return signals.map((signal) => done.get(signal.id) ?? signal);
}

export async function executeScan(input: {
  typesafeKey: string;
  focus?: string;
}): Promise<ScanResult | ScanError> {
  const key = input.typesafeKey.trim();
  if (key.length < 8) return { ok: false, error: "TypeSafe API key required." };

  const probe = await probeTypeSafe(key);
  if (!probe.ok) return probe;

  const warnings: string[] = [];
  const [x, gh] = await Promise.all([
    fetchXSignals(input.focus),
    fetchGithubSignals(input.focus),
  ]);

  if (x.warning) warnings.push(x.warning);
  if (gh.warning) warnings.push(gh.warning);

  const merged = [...x.items, ...gh.items];
  const rawById = new Map(merged.map((item) => [item.id, item]));
  if (!merged.length) {
    return {
      ok: false,
      error: warnings[0] || "No signals this scan.",
    };
  }

  const { signals, scored, failures } = await scoreAll(key, merged);
  if (failures) warnings.push(`TypeSafe skipped ${failures} items after API errors.`);
  if (!signals.length) {
    return { ok: false, error: "TypeSafe scored nothing." };
  }

  const ready = await settleKept(signals);
  for (const signal of ready) {
    const raw = rawById.get(signal.id);
    if (raw) writeCachedScore(raw, signal);
  }

  return {
    ok: true,
    signals: ready,
    stats: {
      xFetched: x.items.length,
      githubFetched: gh.items.length,
      scored,
      kept: ready.filter((s) => s.kept).length,
    },
    warnings,
  };
}
