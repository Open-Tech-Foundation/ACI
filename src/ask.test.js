import { assertEquals, test } from "runtime:test";

import world from "../data/knowledge/world.json" with { type: "json" };
import english from "../data/language/english.json" with { type: "json" };
import { Knowledge } from "./knowledge.js";
import { Language } from "./language.js";
import { createBrain } from "./brain.js";

const brain = () =>
  createBrain({ knowledge: new Knowledge(world), language: new Language(english) });

const answer = (text) => brain().ask(text).answer;

test("yes to something it can derive but was never taught", () => {
  assertEquals(answer("is a sparrow an animal?"), ["yes"]);
});

test("no to something that does not hold", () => {
  assertEquals(answer("is an apple an animal?"), ["no"]);
});

test("comparison walks both sides up to a shared scale", () => {
  assertEquals(answer("which is heavier, apple or cat?"), ["cat"]);
  assertEquals(answer("which is lighter, apple or cat?"), ["apple"]);
});

test("the comparison is over kinds, never over numbers", () => {
  const { because } = brain().ask("which is heavier, apple or cat?");
  assertEquals(because, [["hand-sized", "less-weight", "carry-sized"]]);
});

test("a gap with a relation is filled from the facts", () => {
  assertEquals(answer("what is your name?"), ["ACI"]);
});

test("a question it cannot compile answers nothing", () => {
  const asked = brain().ask("explain me algebra");
  assertEquals(asked.gap, null);
  assertEquals(asked.answer, []);
});

test("words it has never met are reported, not guessed at", () => {
  assertEquals(brain().ask("explain me algebra").unknown, ["explain", "algebra"]);
});

test("the same question answers the same every time", () => {
  for (let i = 0; i < 5; i += 1) assertEquals(answer("which is heavier, apple or cat?"), ["cat"]);
});

test("every answer names the facts it came from", () => {
  const { answer: said, because } = brain().ask("is a sparrow an animal?");
  assertEquals(said, ["yes"]);
  assertEquals(because, [["sparrow", "is-a", "animal"]]);
});
