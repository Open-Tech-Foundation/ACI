import { assertEquals, assertThrows, test } from "runtime:test";

import { learnedFrom } from "./lesson.js";

const lesson = {
  start: "idle",
  effects: [{ state: "idle", signal: "a", next: "moved" }],
  expressions: [{ state: "moved", signal: "here" }],
};

test("a lesson becomes learned memory", () => {
  const learned = learnedFrom(lesson);
  assertEquals(learned.start, "idle");
  assertEquals(learned.effectOf("idle", "a"), "moved");
  assertEquals(learned.expressionOf("moved"), "here");
});

test("a lesson with no effects is still a lesson", () => {
  assertEquals(learnedFrom({ start: "idle" }).start, "idle");
});

test("a lesson must say where it begins", () => {
  assertThrows(() => learnedFrom({ effects: [] }));
  assertThrows(() => learnedFrom({ start: "" }));
});

test("a key nobody defined is refused rather than ignored", () => {
  assertThrows(() => learnedFrom({ ...lesson, weight: 0.5 }));
});

test("a row missing a field names the row that is wrong", () => {
  assertThrows(
    () => learnedFrom({ start: "idle", effects: [{ state: "idle", signal: "a" }] }),
    /effects\[0\]: next/,
  );
});

test("what is not an object is not a lesson", () => {
  assertThrows(() => learnedFrom(null));
  assertThrows(() => learnedFrom([]));
  assertThrows(() => learnedFrom({ start: "idle", effects: {} }));
});

test("contradictory data is refused, as contradictory teaching is", () => {
  assertThrows(() =>
    learnedFrom({
      start: "idle",
      effects: [
        { state: "idle", signal: "a", next: "one" },
        { state: "idle", signal: "a", next: "two" },
      ],
    }),
  );
});
