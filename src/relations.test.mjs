import { test, assert, assertEquals } from "runtime:test";
import { brainFrom } from "./brain.js";
import { fromSources } from "./knowledge.js";

// A world with two relations over the same terms: one chain of `is`, one of
// `part`. Nothing about them is special to `is` — both are terms, both are
// walked the same way.
const IS = 90;
const PART = 91;
const MEETS = 92;
const MIRRORS = 93;
const AVOIDS = 94;
const worldData = {
  anchors: { thing: 1, relation: 2 },
  relations: { is: IS },
  terms: [
    { id: 1, name: "thing", links: [] },
    { id: 2, name: "relation", links: [] },
    { id: 90, name: "is", links: [{ rel: IS, to: 2 }] },
    { id: 91, name: "part", links: [{ rel: IS, to: 2 }] },
    { id: 92, name: "meeting", symmetric: true, links: [{ rel: IS, to: 2 }] },
    { id: 93, name: "mirroring", reflexive: true, links: [{ rel: IS, to: 2 }] },
    { id: 94, name: "avoiding", irreflexive: true, links: [{ rel: IS, to: 2 }] },
    { id: 10, name: "bird", links: [{ rel: IS, to: 1 }, { rel: MEETS, to: 12 }] },
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
    meets: { pos: "verb", meaning: "meets", concept: 92 },
    mirrors: { pos: "verb", meaning: "mirrors", concept: 93 },
    avoids: { pos: "verb", meaning: "avoids", concept: 94 },
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
  return (r.roots[0].branch || []).find((b) => b.kind === "standing");
};

test("a claim is checked against the relation the signal named", () => {
  assertEquals(truth("wing parts bird").name, "held");
  assertEquals(truth("wing parts bird").state.relation, PART);
});

test("the same pair does not hold under a different relation", () => {
  assertEquals(truth("wing is bird").name, "absent", "nothing says it cannot be");
  assertEquals(truth("wing is bird").state.relation, IS);
});

test("a relation holds only where the data links it", () => {
  assertEquals(truth("stone parts bird").name, "absent");
});

test("each relation runs one way", () => {
  assertEquals(truth("bird parts wing").name, "absent", "not backwards, and not denied");
});

test("an ordinary relation may be learned independently in both directions", () => {
  const result = brainFrom("bird parts wing", knowledge);
  assertEquals(result.expression.name, "learn");
  assertEquals(result.learned.terms, [
    { id: 10, name: "bird", links: [{ rel: PART, to: 11 }] },
  ]);
});

test("a declared symmetric relation entails its reverse without a duplicate fact", () => {
  const result = brainFrom("stone meets bird", knowledge);
  assertEquals(result.expression.name, "understood");
  assertEquals(truth("stone meets bird").name, "held");
  assertEquals(result.learned, null);
});

test("reflexive and irreflexive declarations decide self-relations", () => {
  const reflected = brainFrom("bird mirrors bird", knowledge);
  assertEquals(reflected.expression.name, "understood");
  assertEquals(truth("bird mirrors bird").name, "held");
  assertEquals(reflected.learned, null);

  const avoided = brainFrom("bird avoids bird", knowledge);
  assertEquals(avoided.expression.name, "deny");
  assertEquals(truth("bird avoids bird").name, "against");
  assertEquals(avoided.learned, null);
});

test("a term reached by one relation is not reached by another", () => {
  assert(world.isA(11, 10, PART), "wing is part of bird");
  assertEquals(world.isA(11, 10), false, "but a wing is not a kind of bird");
});
