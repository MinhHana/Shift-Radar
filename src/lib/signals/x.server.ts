import { asNumber, asString, extractJson } from "./parse";
import type { RawItem } from "./types";

type GrokOutput =
  | string
  | Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }> | string;
      text?: string;
    }>;

function collectText(body: Record<string, unknown>): string {
  const chunks: string[] = [];
  if (typeof body.output_text === "string") chunks.push(body.output_text);
  const output = body.output as GrokOutput | undefined;
  if (typeof output === "string") chunks.push(output);
  if (Array.isArray(output)) {
    for (const item of output) {
      if (typeof item.text === "string") chunks.push(item.text);
      if (typeof item.content === "string") chunks.push(item.content);
      if (Array.isArray(item.content)) {
        for (const c of item.content) {
          if (typeof c?.text === "string") chunks.push(c.text);
        }
      }
    }
  }
  const choices = body.choices as Array<{ message?: { content?: unknown } }> | undefined;
  const content = choices?.[0]?.message?.content;
  if (typeof content === "string") chunks.push(content);
  return chunks.join("\n");
}

function collectUrls(body: Record<string, unknown>): string[] {
  const urls = new Set<string>();
  const citations = body.citations;
  if (Array.isArray(citations)) {
    for (const c of citations) {
      if (typeof c === "string" && /x\.com|twitter\.com/.test(c)) urls.add(c);
      if (c && typeof c === "object") {
        const u = (c as { url?: string }).url;
        if (u && /x\.com|twitter\.com/.test(u)) urls.add(u);
      }
    }
  }
  return [...urls];
}

function statusId(url: string): string | null {
  const m = url.match(/(?:x\.com|twitter\.com)\/[^/]+\/status\/(\d+)/);
  return m?.[1] ?? null;
}

function itemsFromUnknown(data: unknown, citationUrls: string[]): RawItem[] {
  const list: unknown[] = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { items?: unknown[] }).items)
      ? ((data as { items: unknown[] }).items)
      : [];

  const out: RawItem[] = [];
  for (const row of list) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const url = asString(r.post_url || r.url || r.link);
    const id = statusId(url) ?? asString(r.id) ?? `x-${out.length}`;
    const text = asString(r.text || r.content || r.body);
    const handle = asString(r.author_handle || r.handle || r.author).replace(/^@/, "");
    if (!text && !url) continue;
    out.push({
      id: `x:${id}`,
      source: "x",
      title: text.slice(0, 90) || `@${handle}`,
      text: text || url,
      url: url || `https://x.com/${handle}`,
      author: handle ? `@${handle}` : asString(r.author_name) || "X",
      createdAt: asString(r.created_at || r.date) || new Date().toISOString(),
      stats: {
        likes: asNumber(r.likes ?? r.favorite_count),
        reposts: asNumber(r.reposts ?? r.retweets ?? r.retweet_count),
        replies: asNumber(r.replies ?? r.reply_count),
        views: asNumber(r.views ?? r.impression_count),
      },
    });
  }

  if (!out.length && citationUrls.length) {
    citationUrls.slice(0, 12).forEach((url, i) => {
      const id = statusId(url) ?? String(i);
      const handle = url.match(/(?:x\.com|twitter\.com)\/([^/]+)/)?.[1] ?? "unknown";
      out.push({
        id: `x:${id}`,
        source: "x",
        title: `Signal from @${handle}`,
        text: `Post on X: ${url}`,
        url,
        author: `@${handle}`,
        createdAt: new Date().toISOString(),
        stats: {},
      });
    });
  }

  const seen = new Set<string>();
  return out.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

const SYSTEM = `You retrieve AI signals from X for a working software/ML engineer.
Return ONLY JSON: {"items":[{...}]}.
Each item: post_url, author_handle, author_name, text, created_at (ISO), likes, reposts, replies, views, mentioned_urls.
Rules:
- Prefer NEW artifacts: primitives, papers, repos, CLI/API updates, training methods, agents, evals.
- INCLUDE closed AND open source.
- INCLUDE posts with low engagement if the substance might matter. Popularity is not a filter.
- INCLUDE Grok Build CLI / xAI / TypeSafe / Jev / System One if anything new exists.
- Max 14 items. Real x.com status URLs only. No invented URLs.`;

export async function fetchXSignals(focus?: string): Promise<{ items: RawItem[]; warning?: string }> {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) return { items: [], warning: "Missing xAI key — cannot scan X." };

  const focusLine = focus?.trim()
    ? `Extra focus from the user (still apply the engineer/research filter): ${focus.trim()}`
    : "No extra focus.";

  const user = `${focusLine}

Search X for the last 14 days. Find signals about:
- New AI primitives and software-native interfaces (typed decisions, structured output, MCP, harnesses)
- New research (papers, methods, results) even if obscure
- Open-source repos and reproductions
- Closed lab/API/CLI updates, including Grok Build CLI, TypeSafe Jev, model APIs
- How engineers actually build with AI

Return JSON only.`;

  const fromDate = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  try {
    const res = await fetch("https://api.x.ai/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4.5",
        input: [
          { role: "system", content: SYSTEM },
          { role: "user", content: user },
        ],
        tools: [{ type: "x_search", from_date: fromDate }],
        max_output_tokens: 3500,
      }),
    });

    if (!res.ok) {
      const fallback = await fetchViaChat(apiKey, SYSTEM, user);
      if (fallback.items.length) return fallback;
      return { items: [], warning: `X search error ${res.status}.` };
    }

    const body = (await res.json()) as Record<string, unknown>;
    const text = collectText(body);
    const urls = collectUrls(body);
    const parsed = extractJson(text);
    const items = itemsFromUnknown(parsed, urls).slice(0, 14);
    if (!items.length) {
      const fallback = await fetchViaChat(apiKey, SYSTEM, user);
      if (fallback.items.length) return fallback;
      return { items: [], warning: "Grok returned no X posts." };
    }
    return { items };
  } catch {
    const fallback = await fetchViaChat(apiKey, SYSTEM, user);
    if (fallback.items.length) return fallback;
    return { items: [], warning: "Could not run X search." };
  }
}

async function fetchViaChat(
  apiKey: string,
  system: string,
  user: string,
): Promise<{ items: RawItem[]; warning?: string }> {
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4.5",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        search_parameters: {
          mode: "on",
          return_citations: true,
          sources: [{ type: "x" }],
        },
        max_tokens: 2800,
      }),
    });
    if (!res.ok) return { items: [] };
    const body = (await res.json()) as Record<string, unknown>;
    const text = collectText(body);
    const urls = collectUrls(body);
    const parsed = extractJson(text);
    return { items: itemsFromUnknown(parsed, urls).slice(0, 14) };
  } catch {
    return { items: [] };
  }
}
