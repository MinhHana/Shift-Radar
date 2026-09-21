import type { RawItem } from "./types";
import { harvestImageUrls, readmeImages } from "./media";

type Repo = {
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  created_at: string;
  pushed_at: string;
  updated_at: string;
  topics?: string[];
  owner?: { login: string; avatar_url?: string };
};

async function gh(path: string): Promise<Response> {
  const token = process.env.GITHUB_TOKEN?.trim();
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "ShiftRadar/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`https://api.github.com${path}`, { headers });
}

async function search(q: string, sort: "updated" | "stars" = "stars"): Promise<Repo[]> {
  const url = `/search/repositories?q=${encodeURIComponent(q)}&sort=${sort}&order=desc&per_page=8`;
  const res = await gh(url);
  if (!res.ok) return [];
  const json = (await res.json()) as { items?: Repo[] };
  return json.items ?? [];
}

async function readmeExcerpt(fullName: string): Promise<string> {
  try {
    const res = await fetch(`https://api.github.com/repos/${fullName}/readme`, {
      headers: {
        Accept: "application/vnd.github.raw",
        "User-Agent": "ShiftRadar/1.0",
      },
    });
    if (!res.ok) return "";
    const text = await res.text();
    return text.replace(/\r/g, "").slice(0, 1600);
  } catch {
    return "";
  }
}

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10);
}

export async function fetchGithubSignals(focus?: string): Promise<{ items: RawItem[]; warning?: string }> {
  const created = isoDaysAgo(21);
  const pushed = isoDaysAgo(10);
  const extra = focus?.trim() ? `${focus.trim()} ` : "";

  const queries = [
    `${extra}created:>${created} (LLM OR "coding agent" OR MCP OR harness) stars:>=8`,
    `${extra}created:>${created} topic:llm stars:>=12`,
    `${extra}pushed:>${pushed} (vllm OR sglang OR llama.cpp) stars:>=15`,
    `${extra}created:>${isoDaysAgo(10)} ("eval" OR judge OR "structured output") stars:>=8`,
    `${extra}created:>${isoDaysAgo(14)} (MCP OR "coding agent" OR eval OR harness) stars:1..25`,
  ];

  const found: Repo[] = [];
  const seen = new Set<string>();
  let rateLimited = false;

  for (const [i, q] of queries.entries()) {
    const repos = await search(q, i === 2 ? "updated" : "stars");
    if (!repos.length) {
      // Distinguish empty vs failure only loosely
    }
    for (const repo of repos) {
      if (!repo.full_name || seen.has(repo.full_name)) continue;
      seen.add(repo.full_name);
      found.push(repo);
    }
  }

  if (!found.length) {
    const res = await gh("/search/repositories?q=AI+created:>" + created + "&sort=updated&per_page=10");
    if (res.status === 403) rateLimited = true;
    if (res.ok) {
      const json = (await res.json()) as { items?: Repo[] };
      for (const repo of json.items ?? []) {
        if (repo.full_name && !seen.has(repo.full_name)) {
          seen.add(repo.full_name);
          found.push(repo);
        }
      }
    }
  }

  const picked = found.slice(0, 12);
  const items: RawItem[] = [];

  for (const repo of picked) {
    const thin = !(repo.description && repo.description.length > 40);
    const excerpt = thin && items.length < 3 ? await readmeExcerpt(repo.full_name) : "";
    const topics = (repo.topics ?? []).join(", ");
    const desc = repo.description || "No description.";
    items.push({
      id: `gh:${repo.full_name}`,
      source: "github",
      title: repo.full_name,
      text: [
        desc,
        topics ? `Topics: ${topics}` : "",
        `Language: ${repo.language ?? "n/a"}`,
        `Created ${repo.created_at}, pushed ${repo.pushed_at}`,
        excerpt ? `README:\n${excerpt}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      url: repo.html_url,
      author: repo.owner?.login ? `@${repo.owner.login}` : repo.full_name.split("/")[0],
      avatarUrl: repo.owner?.avatar_url || (repo.owner?.login ? `https://github.com/${repo.owner.login}.png?size=80` : undefined),
      createdAt: repo.pushed_at || repo.updated_at || repo.created_at,
      imageUrls: harvestImageUrls(
        `https://opengraph.githubassets.com/1/${repo.full_name}`,
        excerpt ? readmeImages(excerpt) : [],
      ),
      stats: {
        stars: repo.stargazers_count,
        forks: repo.forks_count,
      },
    });
  }

  const warning = !items.length
    ? rateLimited
      ? "GitHub rate limit — try again later."
      : "No matching repos."
    : undefined;

  return { items, warning };
}
