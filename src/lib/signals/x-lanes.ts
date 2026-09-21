import { voiceSearchGroups } from "./voices";

const voiceQs = voiceSearchGroups();

export const X_LANES = [
  {
    id: "voices",
    label: "Voices",
    fromDays: 14,
    toDays: 0,
    brief: `Posts last 14 days FROM these AI founders, labs, researchers, critics, and builders. Search 1: ${voiceQs[0]}. Search 2: ${voiceQs[1]}. Prefer first-hand shipping notes, papers, critiques that change practice. Skip memes and quote-dunks.`,
  },
  {
    id: "cli",
    label: "CLI / APIs",
    fromDays: 14,
    toDays: 0,
    brief:
      "CLI and API updates last 14 days: Grok Build CLI, xAI, Claude Code, Codex, Gemini CLI, model APIs, version numbers.",
  },
  {
    id: "jev",
    label: "Practice",
    fromDays: 14,
    toDays: 0,
    brief:
      "Tools that change how engineers use AI to ship real work last 14 days: coding agents, evals, CLIs, MCP, harnesses, inference, decision APIs. Same class of impact TypeSafe had: people change what they build with.",
  },
  {
    id: "research",
    label: "Research",
    fromDays: 14,
    toDays: 0,
    brief:
      "New AI papers, arXiv, training methods, architectures, open weights, evals last 14 days. Prefer first-hand artifacts.",
  },
] as const;

export type XLaneId = (typeof X_LANES)[number]["id"];