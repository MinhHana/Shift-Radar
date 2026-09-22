import { extractJson } from "./parse";
import type { Trend } from "./types";

const PROBLEM_VI: Record<string, string> = {
  routing: "Định tuyến / phân loại bằng AI",
  decision: "Quyết định typed trong phần mềm",
  agent: "Agent và harness",
  eval: "Eval và kiểm chứng",
  codegen: "AI viết code",
  training: "Training và kiến trúc model",
  infra: "Hạ tầng inference",
  product: "Sản phẩm AI mới",
  research: "Nghiên cứu AI",
  cli: "CLI và toolchain",
  other: "Tín hiệu AI khác",
};

type Item = {
  id: string;
  soWhat: string;
  title: string;
  author: string;
  composite: number;
  source: string;
  problem?: string;
};

export function fallbackTrends(items: Item[]): Trend[] {
  const groups = new Map<string, Item[]>();
  for (const it of items) {
    const key = it.problem || "other";
    const list = groups.get(key) ?? [];
    list.push(it);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .sort((a, b) => {
      const sa = a[1].reduce((n, x) => n + x.composite, 0);
      const sb = b[1].reduce((n, x) => n + x.composite, 0);
      return sb - sa;
    })
    .slice(0, 15)
    .map(([key, list], i) => ({
      id: `trend-${i}-${key}`,
      title: PROBLEM_VI[key] || PROBLEM_VI.other,
      signalIds: list.sort((a, b) => b.composite - a.composite).map((x) => x.id),
    }));
}

export async function writeVietnameseTrends(items: Item[]): Promise<Trend[]> {
  const fallback = fallbackTrends(items);
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey || items.length < 2) return fallback;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 20000);
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: ac.signal,
      body: JSON.stringify({
        model: "grok-4-fast",
        messages: [
          {
            role: "system",
            content:
              'Gom các bài thành đúng 15 XU HƯỚNG (không phải 15 bài). Tiêu đề tiếng Việt, tối đa 18 từ, cho kỹ sư: xu hướng gì + vì sao quan trọng. Trả JSON {"trends":[{"title":"...","ids":["id1","id2"]}]}. ids phải lấy từ danh sách. Một bài có thể thuộc 1 xu hướng. Bỏ trend chỉ có meme.',
          },
          {
            role: "user",
            content: JSON.stringify(
              items.slice(0, 40).map((it) => ({
                id: it.id,
                jev: Math.round(it.composite * 100),
                problem: it.problem,
                soWhat: it.soWhat,
                title: it.title,
              })),
            ),
          },
        ],
        max_tokens: 1400,
      }),
    });
    if (!res.ok) return fallback;
    const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const parsed = extractJson(body.choices?.[0]?.message?.content ?? "");
    const raw = Array.isArray((parsed as { trends?: unknown }).trends)
      ? ((parsed as { trends: unknown[] }).trends)
      : [];
    const known = new Set(items.map((it) => it.id));
    const trends: Trend[] = [];
    for (const row of raw) {
      if (!row || typeof row !== "object") continue;
      const r = row as { title?: unknown; ids?: unknown };
      const title = typeof r.title === "string" ? r.title.trim() : "";
      const ids = Array.isArray(r.ids)
        ? r.ids.filter((id): id is string => typeof id === "string" && known.has(id))
        : [];
      if (!title || !ids.length) continue;
      trends.push({ id: `trend-${trends.length}`, title, signalIds: [...new Set(ids)] });
      if (trends.length >= 15) break;
    }
    return trends.length ? trends : fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

export async function explainTrendInVietnamese(input: {
  title: string;
  posts: Array<{ author: string; soWhat: string; title: string; text: string }>;
}): Promise<string> {
  const apiKey = process.env.XAI_API_KEY?.trim();
  const fallback = `${input.title}\n\n${input.posts
    .slice(0, 6)
    .map((p) => `• ${p.soWhat || p.title}`)
    .join("\n")}`;
  if (!apiKey) return fallback;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 16000);
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: ac.signal,
      body: JSON.stringify({
        model: "grok-4-fast",
        messages: [
          {
            role: "system",
            content:
              "Bạn là Grok. Giải thích nhóm bài này bằng tiếng Việt, dễ hiểu, cho kỹ sư phần mềm chưa nắm xu hướng. Cấu trúc: 1) Xu hướng này là gì (3-4 câu). 2) Vì sao quan trọng lúc này. 3) Nên chú ý gì / làm gì tiếp. Không hype. Không markdown heading. Đoạn văn ngắn.",
          },
          {
            role: "user",
            content: JSON.stringify({
              trend: input.title,
              posts: input.posts.slice(0, 8).map((p) => ({
                author: p.author,
                soWhat: p.soWhat,
                title: p.title,
                text: p.text.slice(0, 500),
              })),
            }),
          },
        ],
        max_tokens: 700,
      }),
    });
    if (!res.ok) return fallback;
    const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = (body.choices?.[0]?.message?.content ?? "").trim();
    return text.length > 40 ? text : fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
