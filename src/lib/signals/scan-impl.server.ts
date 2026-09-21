import { fetchGithubSignals } from "./github.server";
import { probeTypeSafe, scoreAll } from "./typesafe.server";
import { translateSignals } from "./translate.server";
import { fetchXSignals } from "./x.server";
import type { ScanError, ScanResult } from "./types";

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

  const { signals: english } = await translateSignals(signals);

  return {
    ok: true,
    signals: english,
    stats: {
      xFetched: x.items.length,
      githubFetched: gh.items.length,
      scored,
      kept: english.filter((s) => s.kept).length,
    },
    warnings,
  };
}
