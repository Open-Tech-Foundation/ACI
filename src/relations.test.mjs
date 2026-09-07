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
const POINTS = 95;
const TOUCHES = 96;
const TAPS = 97;
const SUBRELATION = 98;
const DOMAIN = 99;
const RANGE = 100;
const CARES = 101;
const ANIMAL = 102;
const NONLIVING = 103;
const NATURE = 104;
const CAT = 105;
const PET = 106;
const SUBTYPE = 107;
const INSTANCE = 108;
const worldData = {
  anchors: {
    thing: 1,
    relation: 2,
    subrelation: SUBRELATION,
    domain: DOMAIN,
    range: RANGE,
    subtype: SUBTYPE,
    instance: INSTANCE,
  },
  relations: { is: IS },
  terms: [
    { id: 1, name: "thing", links: [] },
    { id: 2, name: "relation", links: [] },
    { id: 90, name: "is", links: [{ rel: IS, to: 2 }] },
    { id: 91, name: "part", links: [{ rel: IS, to: 2 }] },
    { id: 92, name: "meeting", symmetric: true, links: [{ rel: IS, to: 2 }] },
    { id: 93, name: "mirroring", reflexive: true, links: [{ rel: IS, to: 2 }] },
    { id: 94, name: "avoiding", irreflexive: true, links: [{ rel: IS, to: 2 }] },
    { id: 95, name: "pointing", functional: true, links: [{ rel: IS, to: 2 }] },
    { id: 96, name: "touching", links: [{ rel: IS, to: 2 }] },
    { id: 97, name: "tapping", links: [{ rel: IS, to: 2 }, { rel: SUBRELATION, to: TOUCHES }] },
    { id: 98, name: "subrelation", asymmetric: true, transitive: true, links: [{ rel: IS, to: 2 }] },
    { id: DOMAIN, name: "domain", links: [{ rel: IS, to: 2 }] },
    { id: RANGE, name: "range", links: [{ rel: IS, to: 2 }] },
    { id: CARES, name: "caring", links: [{ rel: IS, to: 2 }, { rel: DOMAIN, to: ANIMAL }, { rel: RANGE, to: ANIMAL }] },
    { id: NATURE, name: "nature", disjoint: true, links: [{ rel: IS, to: 1 }] },
    { id: ANIMAL, name: "animal", links: [{ rel: IS, to: NATURE }] },
    { id: NONLIVING, name: "nonliving", links: [{ rel: IS, to: NATURE }] },
    { id: CAT, name: "cat", links: [{ rel: IS, to: ANIMAL }] },
    { id: PET, name: "pet", links: [{ rel: IS, to: ANIMAL }] },
    { id: SUBTYPE, name: "subtype", transitive: true, asymmetric: true, links: [{ rel: IS, to: 2 }, { rel: SUBRELATION, to: IS }] },
    { id: INSTANCE, name: "instance", irreflexive: true, links: [{ rel: IS, to: 2 }, { rel: SUBRELATION, to: IS }] },
    { id: 10, name: "bird", links: [{ rel: IS, to: ANIMAL }, { rel: MEETS, to: 12 }, { rel: POINTS, to: 12 }, { rel: TAPS, to: 12 }, { rel: CARES, to: 11 }] },
    { id: 11, name: "wing", links: [{ rel: IS, to: 1 }, { rel: PART, to: 10 }] },
    { id: 12, name: "stone", links: [{ rel: IS, to: NONLIVING }] },
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
    points: { pos: "verb", meaning: "points", concept: 95 },
    touches: { pos: "verb", meaning: "touches", concept: 96 },
    taps: { pos: "verb", meaning: "taps", concept: 97 },
    narrows: { pos: "verb", meaning: "subrelation", concept: 98 },
    cares: { pos: "verb", meaning: "cares for", concept: CARES },
    animal: { pos: "noun", meaning: "animal", concept: ANIMAL },
    cat: { pos: "noun", meaning: "cat", concept: CAT },
    pet: { pos: "noun", meaning: "pet", concept: PET },
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

test("a functional relation refuses a competing object", () => {
  assertEquals(truth("bird points stone").name, "held");
  assertEquals(truth("bird points wing").name, "against");
  const competing = brainFrom("bird points wing", knowledge);
  assertEquals(competing.expression.name, "deny");
  assertEquals(competing.learned, null);
});

test("a narrower relation entails its broader relation", () => {
  assertEquals(truth("bird taps stone").name, "held");
  assertEquals(truth("bird touches stone").name, "held");
  assertEquals(brainFrom("bird touches stone", knowledge).expression.name, "understood");
  assertEquals(truth("stone touches bird").name, "absent");
});

test("only relations can participate in the relation hierarchy", () => {
  const result = brainFrom("bird narrows stone", knowledge);
  assertEquals(result.expression.name, "deny");
  assertEquals(result.learned, null);
});

test("domain and range implications are understood and incompatible claims are denied", () => {
  assertEquals(truth("wing is animal").name, "held", "range infers the object's kind");
  assertEquals(brainFrom("wing is animal", knowledge).expression.name, "understood");

  const compatible = brainFrom("wing cares bird", knowledge);
  assertEquals(compatible.expression.name, "learn");
  assertEquals(compatible.learned.terms, [
    { id: 11, name: "wing", links: [{ rel: CARES, to: 10 }] },
  ]);

  for (const input of ["stone cares bird", "bird cares stone"]) {
    const result = brainFrom(input, knowledge);
    assertEquals(result.expression.name, "deny", input);
    assertEquals(result.learned, null, input);
  }
});

test("new kind classification is stored as a subtype", () => {
  const result = brainFrom("cat is pet", knowledge);
  assertEquals(result.expression.name, "learn");
  assertEquals(result.learned.terms, [
    { id: CAT, name: "cat", links: [{ rel: world.anchors.subtype, to: PET }] },
  ]);
});

test("a term reached by one relation is not reached by another", () => {
  assert(world.isA(11, 10, PART), "wing is part of bird");
  assertEquals(world.isA(11, 10), false, "but a wing is not a kind of bird");
});
