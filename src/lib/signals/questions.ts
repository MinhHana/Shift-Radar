export const SIGNAL_QUESTIONS = {
  is_ai_signal: {
    type: "noul" as const,
    instructions:
      "Is this an AI-related signal for people who build, train, or apply AI systems — not a meme, not generic tech news, not crypto shilling, not a motivational quote?",
    criteria: {
      true: "About models, training, inference, agents, evals, AI products, AI tooling, or research artifacts.",
      false: "Off-topic, meme, ad, token pump, or empty commentary.",
    },
  },
  is_for_engineer: {
    type: "noul" as const,
    instructions:
      "Would a software engineer, ML engineer, or AI researcher reasonably change what they learn, build, or use after seeing this?",
  },
  is_new_info: {
    type: "noul" as const,
    instructions:
      "Does this contain new information — a release, paper, repo, method, API/CLI change, number, or first-hand finding — rather than a recap of well-known news?",
  },
  is_underdiscussed: {
    type: "noul" as const,
    instructions: {
      question:
        "Is this under-discussed relative to its possible importance? Low likes, stars, or views must NOT count against it. Judge the content, not popularity.",
      rule: "True if few people appear to be talking about it yet the substance could still matter. False if it is already a viral recap or obvious headline.",
    },
  },
  is_primitive: {
    type: "noul" as const,
    instructions:
      "Does this introduce or substantially advance an AI primitive or interface that software can call — not merely another chatbot wrapper? Examples: typed decisions, structured output, MCP/skills, harnesses, eval loops, memory, computer-use, System One-style models.",
  },
  software_native: {
    type: "noul" as const,
    instructions:
      "Can software consume this directly (API, CLI, library, typed outputs, probabilities) rather than a human reading a paragraph?",
  },
  is_english: {
    type: "noul" as const,
    instructions:
      "Is the primary natural language of the post or repo description English? Code identifiers and loanwords do not count as English if the surrounding prose is another language.",
    criteria: {
      true: "Prose is English (or essentially English with isolated foreign terms).",
      false: "Prose is another language (Chinese, Japanese, Korean, Vietnamese, French, etc.).",
    },
  },
  source_lang: {
    type: "choice" as const,
    instructions: "Primary natural language of the prose, not the programming language of a repo.",
    criteria: {
      en: "English",
      zh: "Chinese",
      ja: "Japanese",
      ko: "Korean",
      vi: "Vietnamese",
      ru: "Russian",
      de: "German",
      fr: "French",
      es: "Spanish",
      pt: "Portuguese",
      other: "Another language or mixed equally.",
    },
  },
  origin: {
    type: "choice" as const,
    instructions: "Is this primarily closed-source (lab/API/product), open-source (paper/repo/weights), or mixed?",
    criteria: {
      closed: "Closed model, private API, lab product, proprietary CLI.",
      open: "Public repo, paper, open weights, open protocol.",
      mixed: "Both, or unclear but spans both.",
    },
  },
  audience: {
    type: "choice" as const,
    instructions: "Who is the primary audience?",
    criteria: {
      developer: "App/product developers wiring AI into software.",
      engineer: "ML/infra/platform engineers.",
      researcher: "Scientists and paper authors.",
      mixed: "More than one of the above.",
    },
  },
  problem: {
    type: "choice" as const,
    instructions: "What problem does this help a practitioner solve? Pick the best single fit.",
    criteria: {
      routing: "Routing, classification, triage, ranking of inputs.",
      decision: "Typed/probabilistic decisions inside software (like TypeSafe Jev).",
      agent: "Agents, harnesses, tool loops, computer use.",
      eval: "Evaluation, judges, guardrails, verification.",
      codegen: "AI coding, IDEs, SWE agents, code review.",
      training: "Training methods, architectures, data, alignment.",
      infra: "Inference, serving, kernels, cost/latency of running models.",
      product: "A new end-user or developer AI product.",
      research: "A scientific result whose main value is knowledge, not a tool.",
      cli: "CLI / toolchain updates a practitioner would upgrade (e.g. Grok Build CLI).",
      other: "None of the above.",
    },
  },
  category: {
    type: "choice" as const,
    instructions: "Which bucket is this artifact?",
    criteria: {
      primitive: "New primitive or interface for using AI in software.",
      product: "Shipped product or feature.",
      research: "Paper / scientific finding.",
      tooling: "Library, SDK, CLI, framework.",
      model: "A model release or weights.",
      harness: "Agent harness / runtime.",
      other: "Other.",
    },
  },
  impact_models: {
    type: "score" as const,
    instructions:
      "How much could this change the trajectory of model development (architecture, training, data, evals of models)? Ignore popularity.",
    criteria: [
      "No effect on how models are built.",
      "Minor incremental note.",
      "Meaningful for some research or training teams.",
      "Would change how many labs train or design models.",
      "Category-defining shift in model development.",
    ],
  },
  impact_coding: {
    type: "score" as const,
    instructions:
      "How much could this change how engineers write software with AI (agents, IDEs, primitives, evals, CLIs)? Ignore popularity.",
    criteria: [
      "No effect on engineering workflow.",
      "A small tip or minor library.",
      "Useful change for some teams' coding stack.",
      "Would change how many engineers ship with AI.",
      "Rewrites the coding/agent toolchain.",
    ],
  },
  impact_usage: {
    type: "score" as const,
    instructions:
      "How much could this change how people actually use AI in products and daily work?",
    criteria: [
      "No usage change.",
      "Narrow niche tweak.",
      "New usage pattern for some products.",
      "Broad change in how AI is applied.",
      "New default way of using AI.",
    ],
  },
  career_relevance: {
    type: "score" as const,
    instructions:
      "How important is this for a working AI/software engineer's career literacy this quarter — things they should know to stay current?",
    criteria: [
      "Safe to ignore.",
      "Optional awareness.",
      "Worth a bookmark and a read.",
      "Should learn or try this month.",
      "Core to staying employable/current.",
    ],
  },
  novelty: {
    type: "score" as const,
    instructions:
      "How new is the underlying idea or artifact versus the last few weeks of AI discourse?",
    criteria: [
      "Already widely known recap.",
      "Slightly new angle on a known story.",
      "Fresh artifact or result.",
      "First-seen method or product in this window.",
      "Genuinely new category or primitive.",
    ],
  },
  stack_shift: {
    type: "score" as const,
    instructions:
      "Does this change a layer of the AI stack (train, serve, decide, act, remember, evaluate, connect) rather than adding a wrapper?",
    criteria: [
      "Wrapper / noise.",
      "Thin adapter on an existing layer.",
      "Solid improvement to one layer.",
      "Moves a stack layer for many teams.",
      "Opens or replaces a stack layer.",
    ],
  },
  typesafe_likeness: {
    type: "score" as const,
    instructions:
      "How similar in shape to TypeSafe AI / Jev: a cheap, software-native primitive with wide application surface (typed/probabilistic decisions, not chat)?",
    criteria: [
      "Nothing like TypeSafe.",
      "Loosely related (structured output bolted on a chatbot).",
      "Same neighborhood (typed LLM functions, judges, routers).",
      "Same job: software calls it to decide/score/route at scale.",
      "Directly the same category: System One / native machine decisions.",
    ],
  },
  buildability: {
    type: "score" as const,
    instructions:
      "Could a working engineer actually use or learn from this in the next week (API, repo, CLI, paper with code)?",
    criteria: [
      "Vapor, no artifact.",
      "Vague post, hard to act on.",
      "There is something to click and try.",
      "Clear path to integrate this week.",
      "Drop-in: key, repo, or CLI ready now.",
    ],
  },
} as const;
