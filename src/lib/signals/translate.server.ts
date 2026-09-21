import { extractJson, asString } from "./parse";
import type { Signal } from "./types";

const NON_LATIN =
  /[\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF\u0E00-\u0E7F]/;

export function needsTranslation(text: string, isEnglishNoul: number): boolean {
  if (NON_LATIN.test(text)) return true;
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length < 24) return false;
  const ascii = text.match(/[A-Za-z]/g)?.length ?? 0;
  const ratio = ascii / letters.length;
  if (ratio < 0.82) return true;
  return isEnglishNoul < 0.4 && ratio < 0.95;
}

export async function translateSignals(signals: Signal[]): Promise<{
  signals: Signal[];
  translated: number;
}> {
  const apiKey = process.env.XAI_API_KEY?.trim();
  const todo = signals.filter((s) => needsTranslation(`${s.title}\n${s.text}`, s.scores.isEnglish));
  if (!todo.length || !apiKey) {
    return { signals, translated: 0 };
  }

  const byId = new Map(signals.map((s) => [s.id, s]));
  const chunks: Signal[][] = [];
  for (let i = 0; i < todo.length; i += 6) chunks.push(todo.slice(i, i + 6));

  let translated = 0;
  for (const chunk of chunks) {
    const map = await translateChunk(apiKey, chunk);
    for (const [id, en] of map) {
      const cur = byId.get(id);
      if (!cur) continue;
      byId.set(id, {
        ...cur,
        title: en.title || cur.title,
        text: en.text || cur.text,
        soWhat: en.soWhat || cur.soWhat,
        translated: true,
      });
      translated += 1;
    }
  }

  return { signals: signals.map((s) => byId.get(s.id) ?? s), translated };
}

export async function translateOne(signal: Signal): Promise<Signal> {
  const { signals } = await translateSignals([signal]);
  return signals[0] ?? signal;
}

async function translateChunk(
  apiKey: string,
  chunk: Signal[],
): Promise<Map<string, { title: string; text: string; soWhat: string }>> {
  const payload = chunk.map((s) => ({
    id: s.id,
    title: s.title,
    text: s.text.slice(0, 1800),
    soWhat: s.soWhat,
  }));

  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4-fast",
        messages: [
          {
            role: "system",
            content:
              'Translate each item into English. Return ONLY JSON {"items":[{"id","title","text","soWhat"}]}. Keep @handles, URLs, code fences, model and repo names. Faithful translation, not a summary. If already English, copy unchanged.',
          },
          { role: "user", content: JSON.stringify({ items: payload }) },
        ],
        max_tokens: 4000,
      }),
    });
    if (!res.ok) return new Map();
    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = body.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(text);
    const items = Array.isArray((parsed as { items?: unknown })?.items)
      ? ((parsed as { items: unknown[] }).items)
      : Array.isArray(parsed)
        ? parsed
        : [];
    const out = new Map<string, { title: string; text: string; soWhat: string }>();
    for (const raw of items) {
      if (!raw || typeof raw !== "object") continue;
      const row = raw as Record<string, unknown>;
      const id = asString(row.id);
      if (!id) continue;
      out.set(id, { title: asString(row.title), text: asString(row.text), soWhat: asString(row.soWhat) });
    }
    return out;
  } catch {
    return new Map();
  }
}
