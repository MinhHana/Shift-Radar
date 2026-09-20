import type { RawItem } from "./types";

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
  owner?: { login: string };
};

async function gh(path: string): Promise<Response> {
  return fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "ShiftRadar/1.0",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
}

async function search(q: string): Promise<Repo[]> {
  const url = `/search/repositories?q=${encodeURIComponent(q)}&sort=updated&order=desc&per_page=8`;
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
    `${extra}created:>${created} (LLM OR "language model" OR "coding agent" OR "system one" OR typesafe) stars:>=1`,
    `${extra}pushed:>${pushed} (dspy OR baml OR MCP OR "structured output" OR harness OR jev)`,
    `${extra}created:>${created} topic:llm`,
    `pushed:>${pushed} (inference OR "open weights" OR "diffusion language") language:Python`,
  ];

  const found: Repo[] = [];
  const seen = new Set<string>();
  let rateLimited = false;

  for (const q of queries) {
    const repos = await search(q);
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

  const picked = found.slice(0, 10);
  const items: RawItem[] = [];

  for (const repo of picked) {
    const excerpt = await readmeExcerpt(repo.full_name);
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
      createdAt: repo.pushed_at || repo.updated_at || repo.created_at,
      language: repo.language ?? undefined,
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
