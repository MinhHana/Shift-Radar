import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { foldLiveChunk, sameTrends, type LiveDeskSlice } from "./live-fold.ts";
import type { Signal } from "./types.ts";

function signal(id: string, kept = true): Signal {
  return {
    id,
    source: "x",
    title: id,
    text: id,
    url: "https://x.com/a/status/1",
    author: "@a",
    createdAt: "2026-01-01T00:00:00.000Z",
    stats: {},
    origin: "open",
    audience: "engineer",
    problem: "other",
    category: "other",
    shiftKind: "improves",
    matterBecause: "career",
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
    composite: 0.5,
    reason: "",
    soWhat: "",
    kept,
    translated: false,
  };
}

function desk(partial: Partial<LiveDeskSlice> = {}): LiveDeskSlice {
  return {
    signals: [],
    firstSeen: {},
    lastArrivedId: null,
    scanGen: 2,
    warnings: [],
    stats: { xFetched: 0, githubFetched: 0, scored: 0, kept: 0 },
    liveStatus: "Pulling sources…",
    liveCurrent: null,
    ...partial,
  };
}

describe("foldLiveChunk", () => {
  it("appends a batch once and keeps earlier signal objects", () => {
    const first = signal("a");
    const state = desk({ signals: [first], firstSeen: { a: 1 }, lastArrivedId: "a" });
    const second = signal("b");
    const next = foldLiveChunk(state, {
      liveStatus: "Kept 50 · b",
      liveCurrent: { author: "@b", title: "b", source: "x" },
      signals: [second],
      warnings: ["quiet"],
      stats: { xFetched: 2, githubFetched: 1, scored: 2, kept: 2 },
    });
    assert.ok(next);
    assert.equal(next.signals[0], first);
    assert.equal(next.signals[1], second);
    assert.equal(next.firstSeen.a, 1);
    assert.equal(next.firstSeen.b, 2);
    assert.equal(next.lastArrivedId, "b");
    assert.deepEqual(next.warnings, ["quiet"]);
    assert.equal(next.stats?.scored, 2);
  });

  it("ignores a poll that repeats the same chunk", () => {
    const state = desk({
      signals: [signal("a")],
      firstSeen: { a: 1 },
      lastArrivedId: "a",
      warnings: ["quiet"],
      liveStatus: "Kept 50 · a",
      stats: { xFetched: 1, githubFetched: 0, scored: 1, kept: 1 },
    });
    const again = foldLiveChunk(state, {
      liveStatus: "Kept 50 · a",
      liveCurrent: null,
      signals: [],
      warnings: ["quiet"],
      stats: { xFetched: 1, githubFetched: 0, scored: 1, kept: 1 },
    });
    assert.equal(again, null);
  });

  it("replaces an existing id without cloning the rest of the list", () => {
    const keep = signal("keep");
    const old = signal("a", false);
    const updated = signal("a", true);
    const state = desk({ signals: [keep, old], firstSeen: { keep: 1, a: 1 } });
    const next = foldLiveChunk(state, {
      liveStatus: "Kept 50 · a",
      liveCurrent: null,
      signals: [updated],
      warnings: [],
      stats: null,
    });
    assert.ok(next);
    assert.equal(next.signals[0], keep);
    assert.equal(next.signals[1], updated);
    assert.equal(next.signals.length, 2);
    assert.equal(next.stats, state.stats);
  });
});

describe("sameTrends", () => {
  it("matches id and title in order", () => {
    assert.equal(sameTrends([{ id: "1", title: "A" }], [{ id: "1", title: "A" }]), true);
    assert.equal(sameTrends([{ id: "1", title: "A" }], [{ id: "1", title: "B" }]), false);
  });
});
