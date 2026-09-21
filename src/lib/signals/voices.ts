export type VoiceRole = "founder" | "researcher" | "critic" | "builder";

export type Voice = {
  handle: string;
  name: string;
  role: VoiceRole;
};

export const VOICES: Voice[] = [
  { handle: "sama", name: "Sam Altman", role: "founder" },
  { handle: "gdb", name: "Greg Brockman", role: "founder" },
  { handle: "DarioAmodei", name: "Dario Amodei", role: "founder" },
  { handle: "demishassabis", name: "Demis Hassabis", role: "founder" },
  { handle: "elonmusk", name: "Elon Musk", role: "founder" },
  { handle: "karpathy", name: "Andrej Karpathy", role: "founder" },
  { handle: "clementdelangue", name: "Clem Delangue", role: "founder" },
  { handle: "AndrewYNg", name: "Andrew Ng", role: "founder" },
  { handle: "jeremyphoward", name: "Jeremy Howard", role: "founder" },
  { handle: "fchollet", name: "François Chollet", role: "founder" },
  { handle: "ylecun", name: "Yann LeCun", role: "researcher" },
  { handle: "ilyasut", name: "Ilya Sutskever", role: "researcher" },
  { handle: "jeffdean", name: "Jeff Dean", role: "researcher" },
  { handle: "OriolVinyalsML", name: "Oriol Vinyals", role: "researcher" },
  { handle: "_jasonwei", name: "Jason Wei", role: "researcher" },
  { handle: "rasbt", name: "Sebastian Raschka", role: "researcher" },
  { handle: "giffmana", name: "Lucas Beyer", role: "researcher" },
  { handle: "hardmaru", name: "David Ha", role: "researcher" },
  { handle: "ch402", name: "Chris Olah", role: "researcher" },
  { handle: "nrehiew_", name: "Nathan Lambert", role: "researcher" },
  { handle: "johnschulman2", name: "John Schulman", role: "researcher" },
  { handle: "janleike", name: "Jan Leike", role: "researcher" },
  { handle: "woj_zaremba", name: "Wojciech Zaremba", role: "researcher" },
  { handle: "DrJimFan", name: "Jim Fan", role: "researcher" },
  { handle: "GaryMarcus", name: "Gary Marcus", role: "critic" },
  { handle: "timnitGebru", name: "Timnit Gebru", role: "critic" },
  { handle: "mmitchell_ai", name: "Margaret Mitchell", role: "critic" },
  { handle: "emollick", name: "Ethan Mollick", role: "critic" },
  { handle: "teortaxesTex", name: "Teortaxes", role: "critic" },
  { handle: "swyx", name: "Shawn Wang", role: "builder" },
  { handle: "simonw", name: "Simon Willison", role: "builder" },
  { handle: "ggerganov", name: "Georgi Gerganov", role: "builder" },
  { handle: "awnihannun", name: "Awni Hannun", role: "builder" },
  { handle: "steipete", name: "Peter Steinberger", role: "builder" },
  { handle: "Thom_Wolf", name: "Thomas Wolf", role: "builder" },
  { handle: "huggingface", name: "Hugging Face", role: "builder" },
  { handle: "OpenAI", name: "OpenAI", role: "founder" },
  { handle: "AnthropicAI", name: "Anthropic", role: "founder" },
  { handle: "GoogleDeepMind", name: "Google DeepMind", role: "founder" },
  { handle: "AIatMeta", name: "Meta AI", role: "founder" },
  { handle: "xai", name: "xAI", role: "founder" },
];

const SET = new Set(VOICES.map((v) => v.handle.toLowerCase()));
const FOUNDERS = new Set(VOICES.filter((v) => v.role === "founder").map((v) => v.handle.toLowerCase()));

export function normalizeHandle(raw: string) {
  let h = raw.trim();
  h = h.replace(/^https?:\/\/(x\.com|twitter\.com)\//i, "");
  h = h.replace(/^@/, "").split(/[/?\s]/)[0] ?? "";
  h = h.replace(/[^A-Za-z0-9_]/g, "");
  return h.slice(0, 15);
}

export function isFollowedHandle(raw: string, extra: string[] = []) {
  const h = normalizeHandle(raw).toLowerCase();
  if (!h) return false;
  return SET.has(h) || extra.some((x) => x.toLowerCase() === h);
}

export function isWatchedVoice(author: string, extra: string[] = []) {
  return isFollowedHandle(author, extra);
}

export function isFounderVoice(author: string) {
  return FOUNDERS.has(author.replace(/^@/, "").toLowerCase());
}

export function voiceSearchGroups(extra: string[] = []): string[] {
  const founders = VOICES.filter((v) => v.role === "founder").map((v) => `from:${v.handle}`);
  const rest = VOICES.filter((v) => v.role !== "founder").map((v) => `from:${v.handle}`);
  const custom = extra
    .filter(Boolean)
    .map((h) => `from:${normalizeHandle(h)}`)
    .filter((x) => x.length > 5);
  return [founders.slice(0, 16).join(" OR "), [...rest.slice(0, 18), ...custom].join(" OR ")];
}
