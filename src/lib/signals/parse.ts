export function extractJson(text: string): unknown | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fence ? fence[1] : text;
  const start = raw.search(/[\[{]/);
  if (start < 0) return null;
  const sliced = raw.slice(start);
  try {
    return JSON.parse(sliced);
  } catch {
    const lastBrace = Math.max(sliced.lastIndexOf("}"), sliced.lastIndexOf("]"));
    if (lastBrace > 0) {
      try {
        return JSON.parse(sliced.slice(0, lastBrace + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function asNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(/,/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
