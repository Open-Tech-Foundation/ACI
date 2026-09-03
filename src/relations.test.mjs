import { test, assert, assertEquals } from "runtime:test";
import { brainFrom } from "./brain.js";
import { fromSources } from "./knowledge.js";

// A world with two relations over the same terms: one chain of `is`, one of
// `part`. Nothing about them is special to `is` — both are terms, both are
// walked the same way.
const IS = 90;
const PART = 91;
const worldData = {
  anchors: { thing: 1, relation: 2 },
  relations: { is: IS },
  terms: [
    { id: 1, name: "thing", links: [] },
    { id: 2, name: "relation", links: [] },
    { id: 90, name: "is", links: [{ rel: IS, to: 2 }] },
    { id: 91, name: "part", links: [{ rel: IS, to: 2 }] },
    { id: 10, name: "bird", links: [{ rel: IS, to: 1 }] },
    { id: 11, name: "wing", links: [{ rel: IS, to: 1 }, { rel: PART, to: 10 }] },
    { id: 12, name: "stone", links: [{ rel: IS, to: 1 }] },
  ],
};

const langData = {
  name: "test",
  symbols: { letter: { characters: "abcdefghijklmnopqrstuvwxyz" } },
  words: {
    bird: { pos: "noun", meaning: "bird", concept: 10 },
    wing: { pos: "noun", meaning: "wing", concept: 11 },
    stone: { pos: "noun", meaning: "stone", concept: 12 },
    is: { pos: "verb", meaning: "is", concept: 90 },
    parts: { pos: "verb", meaning: "part of", concept: 91 },
  },
  grammar: {
    start: "sentence",
    rules: {
      sentence: { rules: ["subject predicate"] },
      subject: { rules: ["noun"] },
      predicate: { rules: ["verb verbComplement"] },
      verbComplement: { rules: ["noun"] },
    },
  },
};

const knowledge = fromSources({ world: worldData, languages: [langData] });
const world = knowledge.world;

const truth = (q) => {
  const r = brainFrom(q, knowledge);
  return (r.roots[0].branch || []).find((b) => b.kind === "truth");
};

test("a claim is checked against the relation the signal named", () => {
  assertEquals(truth("wing parts bird").name, "true");
  assertEquals(truth("wing parts bird").state.relation, PART);
});

test("the same pair is false under a different relation", () => {
  assertEquals(truth("wing is bird").name, "false");
  assertEquals(truth("wing is bird").state.relation, IS);
});

test("a relation holds only where the data links it", () => {
  assertEquals(truth("stone parts bird").name, "false");
});

test("each relation runs one way", () => {
  assertEquals(truth("bird parts wing").name, "false");
});

test("a term reached by one relation is not reached by another", () => {
  assert(world.isA(11, 10, PART), "wing is part of bird");
  assertEquals(world.isA(11, 10), false, "but a wing is not a kind of bird");
});
