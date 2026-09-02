import { assert, assertEquals, assertThrows, test } from "runtime:test";
import { RuleEngine, matches } from "./engine.js";

const context = () => ({
  plan: { concept: "greeting", actions: [] },
  patch: undefined,
  understanding: { concepts: [], confidence: 0.4, language: "en", tags: ["a", "b"] },
});

test("a plain value is an equality check on a dotted path", () => {
  assert(matches({ "plan.concept": "greeting" }, context()));
  assert(!matches({ "plan.concept": "farewell" }, context()));
});

test("a path through something missing is undefined, not a crash", () => {
  assert(matches({ "nope.deeply.missing": { $exists: false } }, context()));
});

test("the operators mean what they say", () => {
  const c = context();
  assert(matches({ "understanding.confidence": { $lt: 0.5 } }, c));
  assert(matches({ "understanding.confidence": { $gte: 0.4 } }, c));
  assert(matches({ "understanding.language": { $in: ["en", "fr"] } }, c));
  assert(matches({ "understanding.tags": { $has: "b" } }, c));
  assert(matches({ "understanding.concepts": { $empty: true } }, c));
  assert(matches({ "plan.concept": { $ne: "farewell" } }, c));
  assert(matches({ "plan.concept": { $not: { $eq: "farewell" } } }, c));
});

test("every clause must hold", () => {
  const c = context();
  assert(!matches({ "plan.concept": "greeting", "understanding.language": "fr" }, c));
});

test("an unknown operator is an error rather than a rule that never fires", () => {
  assertThrows(() => matches({ "plan.concept": { $wat: 1 } }, context()));
});

test("a function condition is honoured", () => {
  assert(matches((c) => c.plan.concept === "greeting", context()));
});

test("rules fire in priority order", () => {
  const order = [];
  const engine = new RuleEngine([
    { id: "low", stage: "think", priority: 1, then: () => order.push("low") },
    { id: "high", stage: "think", priority: 100, then: () => order.push("high") },
    { id: "mid", stage: "think", priority: 50, then: () => order.push("mid") },
  ]);
  engine.run("think", context());
  assertEquals(order.join(","), "high,mid,low");
});

test("stop ends the stage", () => {
  const order = [];
  const engine = new RuleEngine([
    { id: "first", stage: "think", priority: 10, stop: true, then: () => order.push("first") },
    { id: "second", stage: "think", priority: 1, then: () => order.push("second") },
  ]);
  assertEquals(engine.run("think", context()).join(","), "first");
  assertEquals(order.join(","), "first");
});

test("only the named stage runs", () => {
  const engine = new RuleEngine([
    { id: "t", stage: "think", then: () => {} },
    { id: "s", stage: "solve", then: () => {} },
  ]);
  assertEquals(engine.run("solve", context()).join(","), "s");
});

test("a declarative then merges into the stage's own target", () => {
  const engine = new RuleEngine([{ id: "set", stage: "think", then: { concept: "farewell" } }]);
  const c = context();
  c.patch = c.plan;
  engine.run("think", c);
  assertEquals(c.plan.concept, "farewell");
});

test("a duplicate id is refused", () => {
  const engine = new RuleEngine([{ id: "dup", stage: "think", then: () => {} }]);
  assertThrows(() => engine.add({ id: "dup", stage: "think", then: () => {} }));
});

test("a rule without an id or a stage is refused", () => {
  assertThrows(() => new RuleEngine([{ stage: "think" }]));
  assertThrows(() => new RuleEngine([{ id: "nostage" }]));
});

test("a rule can be removed", () => {
  const engine = new RuleEngine([{ id: "gone", stage: "think", then: () => {} }]);
  assert(engine.remove("gone"));
  assert(!engine.remove("gone"));
  assertEquals(engine.run("think", context()).length, 0);
});
