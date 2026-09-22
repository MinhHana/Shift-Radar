import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readCachedScore, writeCachedScore } from "./score-cache.server.ts";
import type { Signal } from "./types.ts";

function signal(id: string): Signal {
  return {
    id,
    source: "github",
    title: id,
    text: "body",
    url: "https://github.com/a/b",
    author: "@a",
    createdAt: "2026-01-01T00:00:00.000Z",
    stats: {},
    origin: "open",
    audience: "engineer",
    problem: "other",
    category: "other",
    shiftKind: "improves",
    matterBecause: "ship",
    scores: {
      isAiSignal: 1,
      isForEngineer: 1,
      isNewInfo: 1,
      isUnderdiscussed: 1,
      isPrimitive: 1,
      softwareNative: 1,
      isEnglish: 1,
      impactModels: 1,
      impactCoding: 1,
      impactUsage: 1,
      careerRelevance: 1,
      novelty: 1,
      stackShift: 1,
      typesafeLikeness: 1,
      buildability: 1,
      confidence: 1,
    },
    composite: 0.8,
    reason: "",
    soWhat: "Improves the loop.",
    kept: true,
    translated: true,
  };
}

describe("score cache", () => {
  it("returns a hit only when the text fingerprint matches", () => {
    const item = { id: `cache-${Date.now()}`, text: "alpha beta gamma" };
    assert.equal(readCachedScore(item), null);
    const scored = signal(item.id);
    writeCachedScore(item, scored);
    assert.equal(readCachedScore(item), scored);
    assert.equal(readCachedScore({ id: item.id, text: "rewritten body" }), null);
  });
});