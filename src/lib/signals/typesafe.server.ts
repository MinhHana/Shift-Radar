import { SIGNAL_QUESTIONS } from "./questions";
import { buildReason, buildSoWhat, compositeFrom, shouldKeep } from "./reason";
import type {
  Audience,
  CategoryId,
  MatterBecause,
  Origin,
  ProblemId,
  RawItem,
  ShiftKind,
  Signal,
  SignalScores,
} from "./types";

type NoulAnswer = { type: "noul"; noul: number };
type ChoiceAnswer = {
  type: "choice";
  choice: string;
  confidence?: number;
  probabilities?: Record<string, number>;
};
type ScoreAnswer = {
  type: "score";
  score: number;
  confidence?: number;
};

type Answers = Record<string, NoulAnswer | ChoiceAnswer | ScoreAnswer>;

function noul(answers: Answers, key: string): number {
  const a = answers[key];
  if (a && a.type === "noul" && typeof a.noul === "number") return clamp(a.noul);
  return 0;
}

function choice(answers: Answers, key: string, fallback: string): string {
  const a = answers[key];
  if (a && a.type === "choice" && typeof a.choice === "string") return a.choice;
  return fallback;
}

function score01(answers: Answers, key: string, levels = 4): number {
  const a = answers[key];
  if (a && a.type === "score" && typeof a.score === "number") {
    return clamp(a.score / levels);
  }
  return 0;
}

function confidenceOf(answers: Answers): number {
  const vals: number[] = [];
  for (const a of Object.values(answers)) {
    if ("confidence" in a && typeof a.confidence === "number") vals.push(a.confidence);
  }
  if (!vals.length) return 0.5;
  return vals.reduce((s, n) => s + n, 0) / vals.length;
}

function clamp(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function isOrigin(v: string): v is Origin {
  return v === "closed" || v === "open" || v === "mixed";
}
function isAudience(v: string): v is Audience {
  return v === "developer" || v === "engineer" || v === "researcher" || v === "mixed";
}
function isProblem(v: string): v is ProblemId {
  return [
    "routing",
    "decision",
    "agent",
    "eval",
    "codegen",
    "training",
    "infra",
    "product",
    "research",
    "cli",
    "other",
  ].includes(v);
}
function isCategory(v: string): v is CategoryId {
  return ["primitive", "product", "research", "tooling", "model", "harness", "other"].includes(v);
}
function isShift(v: string): v is ShiftKind {
  return v === "solves" || v === "improves" || v === "changes" || v === "enables";
}
function isMatter(v: string): v is MatterBecause {
  return ["stack", "career", "hidden", "ship", "model", "coding"].includes(v);
}

export async function probeTypeSafe(apiKey: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch("https://api.typesafe.ai/v1/systemone", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        state: "probe",
        model: "jev-latest",
        questions: {
          alive: {
            type: "noul",
            instructions: "Is this a connectivity probe?",
          },
        },
      }),
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Invalid TypeSafe key." };
    }
    if (!res.ok) {
      return { ok: false, error: `TypeSafe error ${res.status}.` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reach TypeSafe." };
  }
}

export async function scoreItem(apiKey: string, item: RawItem): Promise<Signal> {
  const state = {
    source: item.source,
    title: item.title,
    author: item.author,
    url: item.url,
    created_at: item.createdAt,
    language: item.language ?? null,
    stats: item.stats,
    text: item.text.slice(0, 6000),
    judge_rule:
      "Popularity is not importance. A 12-star repo or a 20-view post can still be a stack shift. A viral recap can be noise.",
  };

  const res = await fetch("https://api.typesafe.ai/v1/systemone", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      state,
      model: "jev-latest",
      questions: SIGNAL_QUESTIONS,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`TypeSafe ${res.status}: ${body.slice(0, 180)}`);
  }

  const json = (await res.json()) as { answers?: Answers };
  const answers = json.answers ?? {};

  const originRaw = choice(answers, "origin", item.source === "github" ? "open" : "mixed");
  const audienceRaw = choice(answers, "audience", "engineer");
  const problemRaw = choice(answers, "problem", "other");
  const categoryRaw = choice(answers, "category", "other");

  const scores: SignalScores = {
    isAiSignal: noul(answers, "is_ai_signal"),
    isForEngineer: noul(answers, "is_for_engineer"),
    isNewInfo: noul(answers, "is_new_info"),
    isUnderdiscussed: noul(answers, "is_underdiscussed"),
    isPrimitive: noul(answers, "is_primitive"),
    softwareNative: noul(answers, "software_native"),
    isEnglish: noul(answers, "is_english"),
    impactModels: score01(answers, "impact_models"),
    impactCoding: score01(answers, "impact_coding"),
    impactUsage: score01(answers, "impact_usage"),
    careerRelevance: score01(answers, "career_relevance"),
    novelty: score01(answers, "novelty"),
    stackShift: score01(answers, "stack_shift"),
    typesafeLikeness: score01(answers, "typesafe_likeness"),
    buildability: score01(answers, "buildability"),
    confidence: confidenceOf(answers),
  };

  const origin: Origin = isOrigin(originRaw) ? originRaw : "mixed";
  const audience: Audience = isAudience(audienceRaw) ? audienceRaw : "mixed";
  const problem: ProblemId = isProblem(problemRaw) ? problemRaw : "other";
  const category: CategoryId = isCategory(categoryRaw) ? categoryRaw : "other";
  const shiftKind: ShiftKind = isShift(choice(answers, "shift_kind", "improves"))
    ? (choice(answers, "shift_kind", "improves") as ShiftKind)
    : "improves";
  const matterBecause: MatterBecause = isMatter(choice(answers, "matter_because", "career"))
    ? (choice(answers, "matter_because", "career") as MatterBecause)
    : "career";

  const fallback = buildSoWhat({ shiftKind, matterBecause, problem, audience, scores });
  const soWhat = (await writeSoWhat(item, fallback, shiftKind, matterBecause)) || fallback;

  return {
    ...item,
    origin,
    audience,
    problem,
    category,
    shiftKind,
    matterBecause,
    scores,
    composite: compositeFrom(scores),
    reason: buildReason({ origin, audience, problem, category, scores }),
    soWhat,
    kept: shouldKeep(scores),
    translated: false,
    sourceLang: choice(answers, "source_lang", "en"),
  };
}

async function writeSoWhat(
  item: RawItem,
  fallback: string,
  shiftKind: ShiftKind,
  matterBecause: MatterBecause,
): Promise<string> {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) return fallback;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 8000);
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
              "One English sentence, max 28 words, for a working software/ML engineer. Start with Solves, Improves, Changes, or Enables. Name the concrete problem. End with why it matters. No hype. No 'this post'.",
          },
          {
            role: "user",
            content: JSON.stringify({
              verb: shiftKind,
              why: matterBecause,
              fallback,
              title: item.title,
              text: item.text.slice(0, 900),
            }),
          },
        ],
        max_tokens: 80,
      }),
    });
    if (!res.ok) return fallback;
    const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const line = (body.choices?.[0]?.message?.content ?? "").replace(/^["'\s]+|["'\s]+$/g, "").trim();
    if (line.length < 24 || line.length > 240) return fallback;
    return line;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

export async function scoreAll(apiKey: string, items: RawItem[]): Promise<{
  signals: Signal[];
  scored: number;
  failures: number;
}> {
  const signals: Signal[] = [];
  let failures = 0;
  const queue = [...items];
  const workers = Math.min(6, Math.max(1, queue.length));

  async function worker() {
    while (queue.length) {
      const item = queue.shift();
      if (!item) return;
      try {
        signals.push(await scoreItem(apiKey, item));
      } catch {
        failures += 1;
      }
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()));
  signals.sort((a, b) => b.composite - a.composite);
  return { signals, scored: signals.length, failures };
}
