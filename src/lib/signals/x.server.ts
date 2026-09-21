import { asNumber, asString, extractJson } from "./parse";
import { harvestImageUrls, imagesFromRow } from "./media";
import type { RawItem } from "./types";
import { X_LANES, type XLaneId } from "./x-lanes";

export type XWindow = "recent" | "quarter";

type GrokOutput =
  | string
  | Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }> | string;
      text?: string;
    }>;

function collectText(body: Record<string, unknown>): string {
  const chunks: string[] = [];
  const pushFrom = (item: { text?: string; content?: Array<{ type?: string; text?: string }> | string }) => {
    if (typeof item.text === "string") chunks.push(item.text);
    if (typeof item.content === "string") chunks.push(item.content);
    if (Array.isArray(item.content)) {
      for (const c of item.content) {
        if (typeof c?.text === "string") chunks.push(c.text);
      }
    }
  };

  const output = body.output as GrokOutput | undefined;
  if (Array.isArray(output)) {
    const messages = output.filter((item) => item && (item as { type?: string }).type === "message");
    const pick = messages.length ? messages.slice(-1) : output;
    for (const item of pick) pushFrom(item);
  } else if (typeof output === "string") {
    chunks.push(output);
  }
  if (typeof body.output_text === "string") chunks.push(body.output_text);
  const choices = body.choices as Array<{ message?: { content?: unknown } }> | undefined;
  const content = choices?.[0]?.message?.content;
  if (typeof content === "string") chunks.push(content);
  return chunks.join("\n");
}

function collectUrls(body: Record<string, unknown>): string[] {
  const urls = new Set<string>();
  const citations = body.citations;
  const blob = `${typeof body.output_text === "string" ? body.output_text : ""}${JSON.stringify(citations ?? [])}`;
  for (const m of blob.matchAll(/https:\/\/(?:x|twitter)\.com\/[^/"'\s\\]+\/status\/\d+/g)) {
    urls.add(m[0].replace(/\\+$/, ""));
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
    const handle = asString(r.author_handle || r.handle || r.author).replace(/^@+/, "");
    const avatar = asString(r.avatar_url || r.profile_image_url || r.author_avatar);
    const imageUrls = harvestImageUrls(imagesFromRow(r), text);
    if (!text && !url && !imageUrls.length) continue;
    out.push({
      id: `x:${id}`,
      source: "x",
      title: text.slice(0, 90) || `@${handle}`,
      text: text || url,
      url: url || `https://x.com/${handle}`,
      author: handle ? `@${handle}` : asString(r.author_name) || "X",
      avatarUrl: avatar || (handle ? `https://unavatar.io/twitter/${encodeURIComponent(handle)}` : undefined),
      createdAt: asString(r.created_at || r.date) || new Date().toISOString(),
      imageUrls,
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
      const sid = statusId(url) ?? String(i);
      const handle = url.match(/(?:x\.com|twitter\.com)\/([^/]+)/)?.[1] ?? "unknown";
      if (handle === "i" || handle === "intent") return;
      out.push({
        id: `x:${sid}`,
        source: "x",
        title: `Signal from @${handle}`,
        text: `Post on X: ${url}`,
        url,
        author: `@${handle}`,
        avatarUrl: `https://unavatar.io/twitter/${encodeURIComponent(handle)}`,
        createdAt: new Date().toISOString(),
        imageUrls: [],
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

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 3600 * 1000).toISOString().slice(0, 10);
}

async function searchX(opts: {
  apiKey: string;
  fromDate: string;
  toDate?: string;
  user: string;
  searches: number;
  timeoutMs: number;
}): Promise<{ items: RawItem[]; warning?: string }> {
  const system = `You retrieve AI signals from X for a software/ML engineer who does not have time to scroll.
Return ONLY JSON: {"items":[{post_url,author_handle,author_name,avatar_url,text,created_at,likes,reposts,replies,views,image_urls}]}.
Rules: real x.com status URLs only; do at most ${opts.searches} X searches then answer immediately; max 10 items.
FULL briefing: popular shipping updates AND under-discussed high-impact artifacts.
Prefer an artifact: version, paper, repo, API/CLI, weights. Skip jokes and recaps.
image_urls: pbs.twimg.com photo URLs, or [].`;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), opts.timeoutMs);
  const tool: { type: "x_search"; from_date: string; to_date?: string } = {
    type: "x_search",
    from_date: opts.fromDate,
  };
  if (opts.toDate) tool.to_date = opts.toDate;
  try {
    const res = await fetch("https://api.x.ai/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: ac.signal,
      body: JSON.stringify({
        model: "grok-4-fast",
        input: [
          { role: "system", content: system },
          { role: "user", content: opts.user },
        ],
        tools: [{ ...tool, enable_image_understanding: false }],
        max_output_tokens: 1800,
      }),
    });
    if (!res.ok) {
      return { items: [], warning: `X search error ${res.status}.` };
    }
    const body = (await res.json()) as Record<string, unknown>;
    const text = collectText(body);
    const urls = collectUrls(body);
    const parsed = extractJson(text);
    const items = itemsFromUnknown(parsed, urls).slice(0, 10);
    for (const item of items) {
      if (item.imageUrls?.length) continue;
      item.imageUrls = harvestImageUrls(item.text, text);
    }
    if (!items.length) return { items: [], warning: "Grok returned no X posts." };
    return { items };
  } catch (err) {
    const timed = err instanceof Error && (err.name === "AbortError" || /aborted|timeout/i.test(err.message));
    return { items: [], warning: timed ? "X search timed out." : "Could not run X search." };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchXSignals(
  focus?: string,
  window: XWindow = "recent",
  laneId?: string,
  extraVoices: string[] = [],
): Promise<{ items: RawItem[]; warning?: string }> {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) return { items: [], warning: "Missing xAI key — cannot scan X." };

  const focusLine = focus?.trim()
    ? `Extra focus from the user (still apply the engineer/research filter): ${focus.trim()}`
    : "No extra focus.";

  const userFor = (brief: string) => `${focusLine}

${brief}
Do the searches then return JSON. Cover the last 14 days, not only today.`;

  if (window === "quarter") {
    return searchX({
      apiKey,
      fromDate: daysAgo(90),
      toDate: daysAgo(14),
      searches: 2,
      timeoutMs: 40000,
      user: userFor("Stack-shifting AI artifacts from 14 days ago back to 3 months. Not recaps."),
    });
  }

  const lane = X_LANES.find((l) => l.id === (laneId as XLaneId)) ?? X_LANES[0];
  const extra = extraVoices
    .map((h) => h.replace(/^@/, "").trim())
    .filter(Boolean)
    .slice(0, 40);
  const extraLine =
    extra.length && lane.id === "voices"
      ? ` Also search posts FROM these extra accounts the user follows: ${extra.map((h) => `from:${h}`).join(" OR ")}.`
      : extra.length
        ? ` Prefer posts from these followed accounts when relevant: ${extra.map((h) => `@${h}`).join(" ")}.`
        : "";
  const first = await searchX({
    apiKey,
    fromDate: daysAgo(lane.fromDays),
    toDate: lane.toDays > 0 ? daysAgo(lane.toDays) : undefined,
    searches: 2,
    timeoutMs: 32000,
    user: userFor(`${lane.brief}${extraLine}`),
  });
  if (first.items.length) return first;

  const retry = await searchX({
    apiKey,
    fromDate: daysAgo(lane.fromDays),
    searches: 1,
    timeoutMs: 20000,
    user: userFor(`${lane.brief}${extraLine} One search only. Return whatever you have.`),
  });
  if (retry.items.length) return retry;
  return { items: [], warning: first.warning || retry.warning };
}
