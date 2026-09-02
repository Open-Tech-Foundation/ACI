import { assertEquals, test } from "runtime:test";

import { audit, meaningOf, reachable } from "./audit.js";
import { Learned } from "./memory/learned.js";
import { illustration } from "../fixtures/illustration.js";

test("reachable walks out from the start, and no further", () => {
  const learned = new Learned()
    .begins("a")
    .effect("a", "x", "b")
    .effect("b", "y", "c")
    // Taught, but nothing leads to it.
    .effect("d", "z", "e");

  assertEquals([...reachable(learned)].sort(), ["a", "b", "c"]);
});

test("training nothing can reach is reported", () => {
  const learned = new Learned().begins("a").effect("a", "x", "b").effect("d", "z", "e");
  assertEquals(audit(learned).unreachable, ["d", "e"]);
});

test("a state that can never speak or move again is reported as stuck", () => {
  const learned = new Learned().begins("a").effect("a", "x", "hole");
  assertEquals(audit(learned).stuck, ["hole"]);
});

test("a silent state that can still move on is not stuck", () => {
  const learned = new Learned()
    .begins("a")
    .effect("a", "x", "quiet")
    .effect("quiet", "y", "a")
    .expresses("a", "here");

  assertEquals(audit(learned).stuck, []);
  assertEquals(audit(learned).silent, ["quiet"]);
});

test("a signal that never changes the answer is inert", () => {
  const learned = new Learned()
    .begins("a")
    .effect("a", "x", "b")
    .effect("b", "x", "b")
    .expresses("a", "same")
    .expresses("b", "same");

  assertEquals(meaningOf(learned, "x").means.size, 0);
  assertEquals(audit(learned).inert.includes("x"), true);
});

test("a signal that acts in one place and not another is conditional", () => {
  // "stop" says nothing before a greeting and back-off after one. It only ever
  // turns the answer into one thing, so it is conditional but not ambiguous.
  const example = audit(illustration());
  assertEquals(example.conditional.includes("stop"), true);
  assertEquals(meaningOf(illustration(), "stop").means.size, 1);
});

test("a signal that can turn the answer into two things is ambiguous", () => {
  const learned = new Learned()
    .begins("a")
    .effect("a", "hey", "greeted")
    .effect("greeted", "hey", "annoyed")
    .expresses("greeted", "hello")
    .expresses("annoyed", "again?");

  const hey = meaningOf(learned, "hey");
  assertEquals([...hey.means].sort(), ["again?", "hello"]);
  assertEquals(audit(learned).ambiguous.map((row) => row.signal), ["hey"]);
});

test("the example training has no ambiguous signal yet", () => {
  // Worth knowing and worth keeping honest: SPEC §3.4 is demonstrated by whole
  // sequences ending in different places, not by any one signal meaning two
  // things. The day that changes, this test is the one that says so.
  assertEquals(audit(illustration()).ambiguous, []);
});

test("the example's training is all reachable and none of it is stuck", () => {
  const example = audit(illustration());
  assertEquals(example.unreachable, []);
  assertEquals(example.stuck, []);
});
