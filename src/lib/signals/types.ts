export type SourceKind = "x" | "github";
export type Origin = "closed" | "open" | "mixed";
export type Audience = "developer" | "engineer" | "researcher" | "mixed";
export type ShiftKind = "solves" | "improves" | "changes" | "enables";
export type MatterBecause = "stack" | "career" | "hidden" | "ship" | "model" | "coding";

export type ProblemId =
  | "routing"
  | "decision"
  | "agent"
  | "eval"
  | "codegen"
  | "training"
  | "infra"
  | "product"
  | "research"
  | "cli"
  | "other";

export type CategoryId =
  | "primitive"
  | "product"
  | "research"
  | "tooling"
  | "model"
  | "harness"
  | "other";

export type TabId =
  | "all"
  | "founders"
  | "hidden"
  | "impact"
  | "new"
  | "research"
  | "repo"
  | "product"
  | "kin"
  | "voices"
  | "dropped";

export type SignalScores = {
  isAiSignal: number;
  isForEngineer: number;
  isNewInfo: number;
  isUnderdiscussed: number;
  isPrimitive: number;
  softwareNative: number;
  isEnglish: number;
  impactModels: number;
  impactCoding: number;
  impactUsage: number;
  careerRelevance: number;
  novelty: number;
  stackShift: number;
  typesafeLikeness: number;
  buildability: number;
  confidence: number;
};

export type SignalStats = {
  likes?: number;
  reposts?: number;
  replies?: number;
  views?: number;
  stars?: number;
  forks?: number;
};

export type Trend = {
  id: string;
  title: string;
  signalIds: string[];
};

export type Signal = {
  id: string;
  source: SourceKind;
  title: string;
  text: string;
  url: string;
  author: string;
  avatarUrl?: string;
  createdAt: string;
  language?: string;
  imageUrls?: string[];
  stats: SignalStats;
  origin: Origin;
  audience: Audience;
  problem: ProblemId;
  category: CategoryId;
  shiftKind: ShiftKind;
  matterBecause: MatterBecause;
  scores: SignalScores;
  composite: number;
  reason: string;
  soWhat: string;
  kept: boolean;
  translated: boolean;
  sourceLang?: string;
};

export type RawItem = {
  id: string;
  source: SourceKind;
  title: string;
  text: string;
  url: string;
  author: string;
  avatarUrl?: string;
  createdAt: string;
  language?: string;
  imageUrls?: string[];
  stats: SignalStats;
};

export type ScanResult = {
  ok: true;
  signals: Signal[];
  stats: {
    xFetched: number;
    githubFetched: number;
    scored: number;
    kept: number;
  };
  warnings: string[];
};

export type ScanError = {
  ok: false;
  error: string;
};

export const PROBLEM_LABEL: Record<ProblemId, string> = {
  routing: "routing / classification",
  decision: "typed decisions in software",
  agent: "agent / harness",
  eval: "eval / verification",
  codegen: "AI coding",
  training: "training / architecture",
  infra: "inference infra",
  product: "new AI product",
  research: "research",
  cli: "CLI / toolchain",
  other: "other problem",
};

export const CATEGORY_LABEL: Record<CategoryId, string> = {
  primitive: "primitive",
  product: "product",
  research: "research",
  tooling: "tooling",
  model: "model",
  harness: "harness",
  other: "other",
};

export const ORIGIN_LABEL: Record<Origin, string> = {
  closed: "closed",
  open: "open",
  mixed: "closed + open",
};

export const AUDIENCE_LABEL: Record<Audience, string> = {
  developer: "developer",
  engineer: "engineer",
  researcher: "researcher",
  mixed: "dev + research",
};

export const SHIFT_LABEL: Record<ShiftKind, string> = {
  solves: "Solves",
  improves: "Improves",
  changes: "Changes",
  enables: "Enables",
};

export const MATTER_LABEL: Record<MatterBecause, string> = {
  stack: "it moves a stack layer you may have to adopt",
  career: "it is career literacy this quarter",
  hidden: "few people are on it yet relative to the likely impact",
  ship: "you can use it in code this week",
  model: "it changes how models are trained, evaluated, or served",
  coding: "it changes how you write software with AI",
};

export const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "founders", label: "Founders" },
  { id: "hidden", label: "Hidden" },
  { id: "impact", label: "Impact" },
  { id: "new", label: "New" },
  { id: "research", label: "Research" },
  { id: "repo", label: "Repo" },
  { id: "product", label: "Product" },
  { id: "kin", label: "Practice" },
  { id: "voices", label: "Voices" },
  { id: "dropped", label: "Dropped" },
];
