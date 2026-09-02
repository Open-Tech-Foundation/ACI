/**
 * brain(): understand -> think -> solve.
 *
 * The three stages are separate exports, not private steps, because each is
 * independently inspectable and independently testable. understand() is pure
 * given a Memory; think() is the only stage that may read conversation state;
 * solve() is the only stage that commits to words. Keeping that discipline is
 * what stops the engine from becoming a single opaque function again.
 */

import { createEnvelope } from "./envelope.js";
import { createMemory } from "./memory/seed.js";
import { RuleEngine } from "./rules/engine.js";
import { coreRules } from "./rules/core-rules.js";
import { tokenize } from "./text/normalize.js";
import { Trace } from "./trace.js";

/**
 * Stage 1 — surface text to meaning.
 *
 * Scans left to right taking the longest known phrase at each position, so
 * "how are you" resolves as one unit rather than three unrelated words. Tokens
 * nothing matches are not errors: they are recorded as unknown and become the
 * evidence that lowers confidence.
 */
export function understand(input, memory, trace = new Trace(false)) {
  const tokens = tokenize(input);
  const matched = [];
  const unknown = [];

  let cursor = 0;
  while (cursor < tokens.length) {
    const found = memory.lookupPhrase(tokens, cursor);
    if (!found) {
      unknown.push(tokens[cursor]);
      trace.push("understand", "unknown", `"${tokens[cursor].surface}" is not in the vocabulary`);
      cursor += 1;
      continue;
    }

    const word = memory.get(found.match.key);
    const surface = tokens.slice(cursor, cursor + found.span).map((t) => t.surface).join(" ");
    matched.push({ surface, normalized: found.text, word, score: found.match.score, method: found.match.method });
    trace.push(
      "understand",
      "match",
      `"${surface}" -> ${word.label} (${found.match.method}, ${found.match.score.toFixed(2)})`,
    );
    cursor += found.span;
  }

  // Language: whichever the matched words agree on, weighted by match quality.
  const languages = new Map();
  for (const entry of matched) {
    const code = entry.word.props.language;
    languages.set(code, (languages.get(code) ?? 0) + entry.score);
  }
  const language = [...languages.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Concepts: a word's concepts, each weighted by how well the word matched.
  const scores = new Map();
  for (const entry of matched) {
    for (const { node, weight } of memory.conceptsOf(entry.word.id)) {
      const name = node.props.name;
      scores.set(name, (scores.get(name) ?? 0) + entry.score * weight);
    }
  }
  const concepts = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, score]) => ({ name, score: round(score) }));

  const emotionNode = concepts.length > 0 ? memory.emotionOf(concepts[0].name) : null;
  const emotion = emotionNode ? { name: emotionNode.props.name, valence: emotionNode.props.valence } : null;

  // Confidence answers "how much of what they said do I actually recognise",
  // which is coverage and match quality together — either alone overstates it.
  const coverage = tokens.length === 0 ? 0 : matched.reduce((n, m) => n + m.normalized.split(" ").length, 0) / tokens.length;
  const quality = matched.length === 0 ? 0 : matched.reduce((n, m) => n + m.score, 0) / matched.length;
  const confidence = round(coverage * quality);

  trace.push("understand", "resolve", concepts.length > 0
    ? `language=${language} concept=${concepts[0].name} emotion=${emotion?.name ?? "none"} confidence=${confidence}`
    : `nothing recognised (${tokens.length} token(s))`);

  return { input, tokens, matched, unknown, language, concepts, emotion, confidence };
}

/**
 * Stage 2 — meaning to a plan.
 *
 * The graph has already said what the input means; think() decides what to do
 * about it, which is the only stage allowed to consider the conversation so far.
 */
export function think(understanding, { memory, engine, context, trace = new Trace(false) }) {
  const primary = understanding.concepts[0] ?? null;
  const plan = {
    strategy: primary ? "respond" : "fallback",
    concept: primary?.name ?? "unknown",
    type: null,
    response: null,
    actions: [],
    data: {},
    confidence: understanding.confidence,
  };

  trace.push("think", "plan", `strategy=${plan.strategy} concept=${plan.concept}`);
  plan.rules = engine.run("think", { understanding, plan, patch: plan, context, memory }, trace);
  return plan;
}

/**
 * Stage 3 — a plan to an envelope.
 *
 * Words come from the graph's templates unless a rule has already committed to
 * one. Template actions and data merge under the plan's, so policy can always
 * add to what the concept says by default but a rule stays authoritative.
 */
export function solve(plan, { memory, engine, context, understanding, trace = new Trace(false) }) {
  const [template] = memory.templatesOf(plan.concept);
  if (template) trace.push("solve", "template", `${plan.concept} -> "${template.props.text}"`);
  else trace.push("solve", "template", `no template for "${plan.concept}", using the built-in fallback`);

  const response = plan.response ?? template?.props.text ?? "I don't have a response for that yet.";
  if (plan.response) trace.push("solve", "override", `a rule set the response directly: "${plan.response}"`);

  const output = {
    response,
    type: plan.type ?? template?.props.type ?? plan.concept,
    actions: [...(template?.props.actions ?? []), ...plan.actions],
    data: { ...(template?.props.data ?? {}), ...plan.data },
  };
  engine.run("solve", { plan, understanding, context, memory, output, patch: output }, trace);
  return createEnvelope({
    input: understanding.input,
    response: output.response,
    type: output.type,
    actions: output.actions,
    data: {
      language: understanding.language,
      concepts: understanding.concepts.map((c) => c.name),
      emotion: understanding.emotion?.name ?? null,
      unknown: understanding.unknown.map((t) => t.surface),
      ...output.data,
    },
    meta: {
      confidence: understanding.confidence,
      strategy: plan.strategy,
      rules: plan.rules ?? [],
      matched: understanding.matched.map((m) => ({
        surface: m.surface,
        word: m.word.label,
        score: round(m.score),
        method: m.method,
      })),
    },
    trace: trace.toJSON(),
  });
}

/**
 * Builds a brain: memory, rules and the conversation it is having.
 *
 * Conversation state lives on the instance rather than being threaded through
 * every call, because "have we met before in this conversation" is exactly the
 * kind of thing think() needs and callers should not have to carry.
 */
export function createBrain({ memory = createMemory(), rules = coreRules, trace = true } = {}) {
  const engine = new RuleEngine(rules);
  const context = { turns: 0, history: [], seen: Object.create(null) };

  /** The whole pipeline, and the only method most callers need. */
  function brain(input, { trace: traceThis = trace } = {}) {
    const recorder = new Trace(traceThis);
    const understanding = understand(input, memory, recorder);
    const plan = think(understanding, { memory, engine, context, trace: recorder });
    const envelope = solve(plan, { memory, engine, context, understanding, trace: recorder });

    // Recorded after the stages ran, so a rule asking "have they greeted me
    // before" is asking about earlier turns and never about this one.
    context.turns += 1;
    context.seen[plan.concept] = (context.seen[plan.concept] ?? 0) + 1;
    context.history.push({ input, response: envelope.response, type: envelope.type });

    return envelope;
  }

  return {
    brain,
    memory,
    engine,
    context,
    understand: (input, recorder = new Trace(trace)) => understand(input, memory, recorder),
    think: (understanding, recorder = new Trace(trace)) =>
      think(understanding, { memory, engine, context, trace: recorder }),
    solve: (plan, understanding, recorder = new Trace(trace)) =>
      solve(plan, { memory, engine, context, understanding, trace: recorder }),

    /** Teaches the brain at runtime — a word, a response, or a rule. */
    learn: {
      word: (surface, options) => memory.word(surface, options),
      respond: (concept, text, options) => memory.respond(concept, text, options),
      relate: (from, type, to, options) => memory.addEdge(from, type, to, options),
      rule: (rule) => engine.add(rule),
    },

    /** Forgets the conversation, keeping everything that was learned. */
    reset() {
      context.turns = 0;
      context.history.length = 0;
      for (const key of Object.keys(context.seen)) delete context.seen[key];
    },
  };
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
