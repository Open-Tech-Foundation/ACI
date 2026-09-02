import { assert, assertEquals, assertThrows, test } from "runtime:test";

import { ConflictError, Learned, UNKNOWN } from "./learned.js";

test("unknown is a signal the brain always has", () => {
  assert(new Learned().knowsSignal(UNKNOWN));
});

test("atoms are declared by being mentioned in an effect", () => {
  const learned = new Learned().effect("idle", "touch", "comfort");
  assert(learned.knowsSignal("touch"));
  assert(learned.states.has("idle"));
  assert(learned.states.has("comfort"));
});

test("an untaught pair has no effect, which is not the same as an effect", () => {
  const learned = new Learned().effect("idle", "touch", "comfort");
  assertEquals(learned.effectOf("idle", "touch"), "comfort");
  assertEquals(learned.effectOf("idle", "shove"), null);
  assertEquals(learned.effectOf("comfort", "touch"), null);
});

test("an untaught state has no expression", () => {
  const learned = new Learned().expresses("comfort", "feel");
  assertEquals(learned.expressionOf("comfort"), "feel");
  assertEquals(learned.expressionOf("idle"), null);
});

test("teaching the same fact twice is not a conflict", () => {
  const learned = new Learned();
  learned.effect("idle", "touch", "comfort").effect("idle", "touch", "comfort");
  learned.expresses("comfort", "feel").expresses("comfort", "feel");
  learned.begins("idle").begins("idle");
  assertEquals(learned.effectOf("idle", "touch"), "comfort");
});

test("a second, different effect for one pair is a training fault", () => {
  // Two answers for one pair would make the brain's next move a choice, and
  // the model does not make choices. It has to fail at teaching time.
  const learned = new Learned().effect("idle", "touch", "comfort");
  assertThrows(() => learned.effect("idle", "touch", "alarmed"), ConflictError);
  assertEquals(learned.effectOf("idle", "touch"), "comfort");
});

test("a second, different expression for one state is a training fault", () => {
  const learned = new Learned().expresses("comfort", "feel");
  assertThrows(() => learned.expresses("comfort", "purr"), ConflictError);
});

test("a second, different start state is a training fault", () => {
  const learned = new Learned().begins("idle");
  assertThrows(() => learned.begins("awake"), ConflictError);
});

test("what was taught survives a round trip through rows", () => {
  const learned = new Learned()
    .begins("idle")
    .effect("idle", "touch", "comfort")
    .effect("idle", "hey", "greeted")
    .expresses("comfort", "feel");

  const copy = Learned.fromRows(learned.toRows());
  assertEquals(copy.toRows(), learned.toRows());
  assertEquals(copy.start, "idle");
  assertEquals(copy.effectOf("idle", "hey"), "greeted");
  assertEquals(copy.expressionOf("comfort"), "feel");
});

test("nothing taught carries a number", () => {
  // A guard, not a formality: a weight, score, valence or priority creeping
  // into this shape is how the model would stop being deterministic.
  const rows = new Learned()
    .begins("idle")
    .effect("idle", "touch", "comfort")
    .expresses("comfort", "feel")
    .toRows();

  for (const row of [...rows.effects, ...rows.expressions]) {
    for (const value of Object.values(row)) assertEquals(typeof value, "string");
  }
});
