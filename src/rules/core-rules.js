/**
 * The default policy.
 *
 * These run in think(), after the graph has produced a meaning and before
 * solve() commits to words. They are ordinary data: an application can drop any
 * of them with `engine.remove(id)` and add its own, which is the point of
 * keeping policy out of the traversal.
 *
 * `because` is not a comment — it is carried into the trace, so the explanation
 * a user reads is written next to the condition that produced it.
 */

export const coreRules = [
  {
    id: "greeting-repeat",
    stage: "think",
    priority: 120,
    because: "already greeted earlier in this conversation",
    when: { "plan.concept": "greeting", "context.seen.greeting": { $gte: 1 } },
    then: (context) => {
      context.plan.response = "Hello again!";
      context.plan.data.repeat = true;
    },
  },
  {
    id: "unknown-fallback",
    stage: "think",
    priority: 110,
    because: "nothing in the input matched the vocabulary",
    when: { "understanding.concepts": { $empty: true } },
    then: (context) => {
      context.plan.concept = "unknown";
      context.plan.strategy = "fallback";
      context.plan.actions.push({ name: "learn_prompt", terms: context.understanding.unknown.map((t) => t.surface) });
    },
  },
  {
    id: "low-confidence-clarify",
    stage: "think",
    priority: 90,
    because: "matched, but too little of the input was understood",
    when: {
      "understanding.confidence": { $lt: 0.5 },
      "understanding.concepts": { $empty: false },
    },
    then: (context) => {
      context.plan.actions.push({ name: "clarify", concept: context.plan.concept });
      context.plan.data.uncertain = true;
    },
  },
  {
    id: "farewell-closes-session",
    stage: "think",
    priority: 80,
    because: "a farewell ends the exchange",
    when: { "plan.concept": "farewell" },
    then: (context) => {
      context.plan.data.closing = true;
    },
  },
  {
    id: "carry-emotion",
    stage: "think",
    priority: 20,
    because: "the concept's affect travels with the response",
    when: { "understanding.emotion": { $exists: true } },
    then: (context) => {
      context.plan.data.emotion = context.understanding.emotion.name;
      context.plan.data.valence = context.understanding.emotion.valence;
    },
  },
];
