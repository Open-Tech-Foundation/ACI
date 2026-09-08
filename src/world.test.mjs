import { test, assert, assertEquals } from "runtime:test";
import { fromWorldData } from "./world.js";

const IS = 294;
const data = {
  anchors: { living: 10, person: 29 },
  relations: { is: IS },
  terms: [
    { id: 1, name: "existence", links: [] },
    { id: 2, name: "thing", links: [{ rel: IS, to: 1 }] },
    { id: 10, name: "organism", links: [{ rel: IS, to: 2 }] },
    { id: 24, name: "animal", links: [{ rel: IS, to: 10 }] },
    { id: 29, name: "person", links: [{ rel: IS, to: 24 }] },
    { id: 83, name: "cat", links: [{ rel: IS, to: 24 }] },
    { id: 90, name: "stone", links: [{ rel: IS, to: 2 }] },
  ],
};

test("isA walks the is chain transitively", () => {
  const w = fromWorldData(data);
  assert(w.isA(83, 10), "cat reaches organism through animal");
  assert(w.isA(83, 1), "and on up to existence");
});

test("isA is false for a term off the chain", () => {
  const w = fromWorldData(data);
  assertEquals(w.isA(90, 10), false);
});

test("a term is itself", () => {
  const w = fromWorldData(data);
  assert(w.isA(10, 10));
});

test("an unknown id reaches nothing", () => {
  const w = fromWorldData(data);
  assertEquals(w.isA(999, 10), false);
});

test("anchors name the brain's categories", () => {
  const w = fromWorldData(data);
  assertEquals(w.anchors.living, 10);
  assert(w.isA(29, w.anchors.living), "a person is living");
});

test("a cycle in the data terminates", () => {
  const w = fromWorldData({
    relations: { is: IS },
    terms: [
      { id: 1, name: "a", links: [{ rel: IS, to: 2 }] },
      { id: 2, name: "b", links: [{ rel: IS, to: 1 }] },
    ],
  });
  assert(w.isA(1, 2));
  assertEquals(w.isA(1, 99), false);
});

test("links that are not the is relation are not followed", () => {
  const w = fromWorldData({
    relations: { is: IS },
    terms: [
      { id: 1, name: "a", links: [{ rel: 777, to: 2 }] },
      { id: 2, name: "b", links: [] },
    ],
  });
  assertEquals(w.isA(1, 2), false);
});

test("all links of a relation are followed, not only the first", () => {
  const w = fromWorldData({
    relations: { is: IS },
    terms: [
      { id: 1, name: "a", links: [{ rel: IS, to: 2 }, { rel: IS, to: 3 }] },
      { id: 2, name: "b", links: [] },
      { id: 3, name: "c", links: [{ rel: IS, to: 4 }] },
      { id: 4, name: "d", links: [] },
    ],
  });
  assert(w.isA(1, 2), "the first link");
  assert(w.isA(1, 3), "and the second");
  assert(w.isA(1, 4), "and on through it");
});

test("two terms exclude each other when their kinds stand different", () => {
  const DIFF = 8;
  const w = fromWorldData({
    relations: { is: IS, different: DIFF },
    terms: [
      { id: 1, name: "thing", links: [] },
      { id: 2, name: "here", links: [{ rel: IS, to: 1 }, { rel: DIFF, to: 3 }] },
      { id: 3, name: "there", links: [{ rel: IS, to: 1 }] },
      { id: 4, name: "a", links: [{ rel: IS, to: 2 }] },
      { id: 5, name: "b", links: [{ rel: IS, to: 3 }] },
      { id: 6, name: "loose", links: [{ rel: IS, to: 1 }] },
    ],
  });
  assert(w.excludes(4, 5), "far apart, but their kinds are different");
  assert(w.excludes(5, 4), "and it reads either way round");
  assertEquals(w.excludes(4, 6), false, "nothing says these two exclude");
  assertEquals(w.excludes(4, 4), false);
});

test("a world that declares no different relation excludes nothing", () => {
  const w = fromWorldData({
    relations: { is: IS },
    terms: [{ id: 1, name: "a", links: [] }, { id: 2, name: "b", links: [] }],
  });
  assertEquals(w.excludes(1, 2), false);
});

test("a term says which number it names, and the number says which term", () => {
  const w = fromWorldData({
    relations: { is: IS },
    terms: [
      { id: 100, name: "zero", links: [], value: 0 },
      { id: 101, name: "one", links: [], value: 1 },
      { id: 102, name: "plain", links: [] },
    ],
  });
  assertEquals(w.valueOf(101), 1);
  assertEquals(w.valueOf(102), null, "a term that names no number");
  assertEquals(w.termFor(0), 100);
  assertEquals(w.termFor(9), null, "the world has no word for it, and says so");
});

test("the world holds no arithmetic, only which symbol is which number", () => {
  const w = fromWorldData({ relations: { is: IS }, terms: [{ id: 1, name: "a", links: [] }] });
  assertEquals(w.valueOf(1), null);
  assertEquals(w.termFor(1), null);
});

test("members are what link to a term, the other way from linked", () => {
  const w = fromWorldData({
    relations: { is: IS },
    terms: [
      { id: 1, name: "kind", links: [] },
      { id: 2, name: "a", links: [{ rel: IS, to: 1 }] },
      { id: 3, name: "b", links: [{ rel: IS, to: 1 }] },
      { id: 4, name: "far", links: [{ rel: IS, to: 2 }] },
    ],
  });
  assertEquals(w.members(1, IS), [2, 3], "direct members only");
  assertEquals(w.linked(2, IS), [1]);
});

test("what a thing held is kept in order, and the latest is what it holds", () => {
  const HAS = 5;
  const w = fromWorldData({
    relations: { is: IS },
    terms: [
      { id: 1, name: "thing", links: [] },
      {
        id: 2,
        name: "one",
        links: [
          { rel: HAS, to: 1, quantity: 3, at: 0 },
          { rel: HAS, to: 1, quantity: 2, at: 1 },
          { rel: HAS, to: 1, quantity: 4, at: 2 },
        ],
      },
    ],
  });
  assertEquals(w.held(2, HAS, 1), 4);
  assertEquals(w.heldOver(2, HAS, 1), [
    { quantity: 3, at: 0 },
    { quantity: 2, at: 1 },
    { quantity: 4, at: 2 },
  ]);
  assertEquals(w.now(), 3);
});

test("a world where nothing has happened is at the beginning of its clock", () => {
  const w = fromWorldData({ relations: { is: IS }, terms: [{ id: 1, name: "a", links: [] }] });
  assertEquals(w.now(), 0);
  assertEquals(w.heldOver(1, 5, 1), []);
});

test("relation asymmetry is world data, not a relation name", () => {
  const w = fromWorldData({
    relations: { is: IS },
    terms: [
      { id: 1, name: "is", links: [] },
      { id: 2, name: "anything", asymmetric: true, links: [] },
      { id: 3, name: "before", links: [] },
    ],
  });
  assertEquals(w.asymmetric(2), true);
  assertEquals(w.asymmetric(3), false);
});

test("a symmetric relation reads positive and negative facts from either end", () => {
  const RELATED = 2;
  const w = fromWorldData({
    relations: { is: IS },
    terms: [
      { id: IS, name: "is", links: [] },
      { id: RELATED, name: "unlabelled relation", symmetric: true, links: [] },
      { id: 3, name: "a", links: [{ rel: RELATED, to: 4 }] },
      { id: 4, name: "b", links: [] },
      { id: 5, name: "c", links: [{ rel: RELATED, to: 6, not: true }] },
      { id: 6, name: "d", links: [] },
    ],
  });
  assertEquals(w.symmetric(RELATED), true);
  assertEquals(w.isA(4, 3, RELATED), true, "one positive edge is readable backwards");
  assertEquals(w.linked(4, RELATED), [3], "answers can leave from either endpoint");
  assertEquals(w.members(3, RELATED), [4], "answers can arrive at either endpoint");
  assertEquals(w.denies(6, 5, RELATED), true, "a denial is the same proposition backwards");
  assertEquals(w.symmetric(IS), false);
});

test("reflexive and irreflexive characteristics decide self-reachability", () => {
  const SELF = 2;
  const DISTINCT = 3;
  const w = fromWorldData({
    relations: { is: IS },
    terms: [
      { id: IS, name: "is", links: [] },
      { id: SELF, name: "self relation", reflexive: true, links: [] },
      { id: DISTINCT, name: "strict relation", irreflexive: true, links: [] },
      { id: 4, name: "a", links: [] },
    ],
  });
  assertEquals(w.reflexive(SELF), true);
  assertEquals(w.isA(4, 4, SELF), true);
  assertEquals(w.linked(4, SELF), [4]);
  assertEquals(w.members(4, SELF), [4]);
  assertEquals(w.irreflexive(DISTINCT), true);
  assertEquals(w.isA(4, 4, DISTINCT), false);
  assertEquals(w.reflexive(DISTINCT), false);
});

test("same substitutes equivalent entities through facts, denials, kinds and state", () => {
  const SAME = 2;
  const DIFFERENT = 3;
  const HOLDS = 4;
  const KIND = 5;
  const w = fromWorldData({
    anchors: { same: SAME },
    relations: { is: IS, same: SAME, different: DIFFERENT },
    terms: [
      { id: IS, name: "is", links: [] },
      { id: SAME, name: "identity", symmetric: true, reflexive: true, transitive: true, links: [] },
      { id: DIFFERENT, name: "distinction", symmetric: true, irreflexive: true, links: [] },
      { id: HOLDS, name: "opaque relation", links: [] },
      { id: KIND, name: "opaque kind", links: [] },
      { id: 6, name: "first representative", links: [
        { rel: SAME, to: 7 },
        { rel: HOLDS, to: 10, quantity: 2 },
      ] },
      { id: 7, name: "second representative", links: [{ rel: SAME, to: 8 }] },
      { id: 8, name: "third representative", individual: true, links: [
        { rel: IS, to: KIND },
        { rel: HOLDS, to: 9, quantity: 2 },
        { rel: HOLDS, to: 12, not: true },
        { rel: DIFFERENT, to: 11 },
      ] },
      { id: 9, name: "object", links: [{ rel: SAME, to: 10 }] },
      { id: 10, name: "object representative", links: [] },
      { id: 11, name: "other", links: [] },
      { id: 12, name: "denied object", links: [] },
      { id: 13, name: "numeric representative", value: 5, links: [{ rel: SAME, to: 14 }] },
      { id: 14, name: "numeric alias", links: [] },
    ],
  });

  assertEquals(w.same(6, 8), true, "identity closes transitively");
  assertEquals(w.isA(8, 6, SAME), true, "identity reads symmetrically");
  assertEquals(w.isA(6, KIND), true, "classification substitutes the subject");
  assertEquals(w.isA(6, 10, HOLDS), true, "ordinary facts substitute both endpoints");
  assertEquals(w.denies(6, 12, HOLDS), true, "denials substitute the subject");
  assertEquals(w.held(6, HOLDS, 10), 2, "quantity state substitutes both endpoints");
  assertEquals(w.heldOver(6, HOLDS, 10), [{ quantity: 2, at: 0 }], "identical history is not duplicated");
  assertEquals(w.isIndividual(6), true, "individual identity substitutes across representatives");
  assertEquals(w.kinds(6), [KIND], "direct kinds substitute across representatives");
  assertEquals(w.individualsOf(KIND), [6], "equivalent individuals appear once");
  assertEquals(w.oneOf(KIND), 6, "one identity remains one individual");
  assertEquals(w.valueOf(14), 5, "numeric values substitute without changing exact arithmetic");
  assertEquals(w.termFor(5), 13, "numeric lookup returns the canonical representative");
  assertEquals(w.isA(6, 11, DIFFERENT), true, "difference follows an equivalent representative");
  assertEquals(w.isA(11, 6, DIFFERENT), true, "difference remains symmetric");
  assertEquals(w.isA(6, 6, DIFFERENT), false, "difference remains irreflexive");
  assertEquals(w.excludes(6, 11), true, "general difference feeds exclusion");
  assertEquals(w.members(10, HOLDS), [6], "open answers collapse identical subjects deterministically");
});

test("asymmetry entails irreflexivity", () => {
  const STRICT = 2;
  const w = fromWorldData({
    relations: { is: IS },
    terms: [
      { id: IS, name: "is", links: [] },
      { id: STRICT, name: "strict", asymmetric: true, links: [] },
    ],
  });
  assertEquals(w.irreflexive(STRICT), true);
});

test("a functional relation exposes only its latest stamped object", () => {
  const VALUE = 2;
  const w = fromWorldData({
    relations: { is: IS },
    terms: [
      { id: IS, name: "is", links: [] },
      { id: VALUE, name: "value relation", functional: true, links: [] },
      { id: 3, name: "subject", links: [{ rel: VALUE, to: 4, at: 0 }, { rel: VALUE, to: 5, at: 1 }] },
      { id: 4, name: "old", links: [] },
      { id: 5, name: "current", links: [] },
    ],
  });
  assertEquals(w.functional(VALUE), true);
  assertEquals(w.linked(3, VALUE), [5]);
  assertEquals(w.isA(3, 4, VALUE), false, "an earlier value is history, not current truth");
  assertEquals(w.isA(3, 5, VALUE), true);
  assertEquals(w.members(4, VALUE), []);
  assertEquals(w.members(5, VALUE), [3]);
  assertEquals(w.functional(IS), false);
});

test("functional state includes facts written through a converse", () => {
  const VALUE = 2;
  const BACK = 3;
  const CONVERSE = 6;
  const w = fromWorldData({
    anchors: { converse: CONVERSE },
    relations: { is: IS },
    terms: [
      { id: IS, name: "is", links: [] },
      { id: VALUE, name: "value relation", functional: true, links: [{ rel: CONVERSE, to: BACK }] },
      { id: BACK, name: "value converse", links: [] },
      { id: 4, name: "subject", links: [] },
      { id: 5, name: "old", links: [{ rel: BACK, to: 4, at: 0 }] },
      { id: CONVERSE, name: "converse", links: [] },
      { id: 7, name: "current", links: [{ rel: BACK, to: 4, at: 1 }] },
    ],
  });
  assertEquals(w.related(4, VALUE), [7]);
  assertEquals(w.isA(4, 5, VALUE), false);
  assertEquals(w.isA(4, 7, VALUE), true);
});

test("a subrelation fact entails every broader relation without copying edges", () => {
  const BROAD = 2;
  const MIDDLE = 3;
  const NARROW = 4;
  const SUBRELATION = 8;
  const w = fromWorldData({
    anchors: { subrelation: SUBRELATION },
    relations: { is: IS },
    terms: [
      { id: IS, name: "is", links: [] },
      { id: BROAD, name: "broad", links: [] },
      { id: MIDDLE, name: "middle", links: [{ rel: SUBRELATION, to: BROAD }] },
      { id: NARROW, name: "narrow", links: [{ rel: SUBRELATION, to: MIDDLE }] },
      { id: 5, name: "a", links: [{ rel: NARROW, to: 6 }] },
      { id: 6, name: "b", links: [] },
      { id: SUBRELATION, name: "subrelation", links: [] },
    ],
  });
  assertEquals(w.subrelationOf(NARROW, BROAD), true);
  assertEquals(w.subrelationOf(BROAD, NARROW), false);
  assertEquals(w.isA(5, 6, BROAD), true);
  assertEquals(w.linked(5, BROAD), [6]);
  assertEquals(w.members(6, BROAD), [5]);
  assertEquals(w.isA(6, 5, BROAD), false, "subrelation does not reverse an edge");
});

test("denying a broader relation denies each narrower claim", () => {
  const BROAD = 2;
  const NARROW = 3;
  const SUBRELATION = 8;
  const w = fromWorldData({
    anchors: { subrelation: SUBRELATION },
    relations: { is: IS },
    terms: [
      { id: IS, name: "is", links: [] },
      { id: BROAD, name: "broad", links: [] },
      { id: NARROW, name: "narrow", links: [{ rel: SUBRELATION, to: BROAD }] },
      { id: 4, name: "a", links: [{ rel: BROAD, to: 5, not: true }] },
      { id: 5, name: "b", links: [] },
      { id: SUBRELATION, name: "subrelation", links: [] },
    ],
  });
  assertEquals(w.denies(4, 5, NARROW), true);
  assertEquals(w.denies(4, 5, BROAD), true);
});

test("broader relation characteristics apply to narrower facts", () => {
  const BROAD = 2;
  const NARROW = 3;
  const SUBRELATION = 8;
  const w = fromWorldData({
    anchors: { subrelation: SUBRELATION },
    relations: { is: IS },
    terms: [
      { id: IS, name: "is", links: [] },
      { id: BROAD, name: "broad", symmetric: true, transitive: true, links: [] },
      { id: NARROW, name: "narrow", links: [{ rel: SUBRELATION, to: BROAD }] },
      { id: 4, name: "a", links: [{ rel: NARROW, to: 5 }] },
      { id: 5, name: "b", links: [{ rel: NARROW, to: 6 }] },
      { id: 6, name: "c", links: [] },
      { id: SUBRELATION, name: "subrelation", links: [] },
    ],
  });
  assertEquals(w.isA(5, 4, BROAD), true, "parent symmetry applies to a child edge");
  assertEquals(w.isA(4, 6, BROAD), true, "parent transitivity composes child edges");
  assertEquals(w.isA(5, 4, NARROW), false, "the child did not declare symmetry");
  assertEquals(w.isA(4, 6, NARROW), false, "the child did not declare transitivity");
});

test("relation domains and ranges infer classifications without copied edges", () => {
  const RELATION = 2;
  const PERSON = 3;
  const VEHICLE = 4;
  const DRIVES = 5;
  const DOMAIN = 6;
  const RANGE = 7;
  const w = fromWorldData({
    anchors: { relation: RELATION, domain: DOMAIN, range: RANGE },
    relations: { is: IS },
    terms: [
      { id: IS, name: "is", links: [{ rel: IS, to: RELATION }] },
      { id: RELATION, name: "relation", links: [] },
      { id: PERSON, name: "person", links: [] },
      { id: VEHICLE, name: "vehicle", links: [] },
      { id: DRIVES, name: "drives", links: [{ rel: IS, to: RELATION }, { rel: DOMAIN, to: PERSON }, { rel: RANGE, to: VEHICLE }] },
      { id: DOMAIN, name: "domain", links: [{ rel: IS, to: RELATION }] },
      { id: RANGE, name: "range", links: [{ rel: IS, to: RELATION }] },
      { id: 8, name: "alice", individual: true, links: [{ rel: DRIVES, to: 9 }] },
      { id: 9, name: "car", individual: true, links: [] },
    ],
  });
  assertEquals(w.domains(DRIVES), [PERSON]);
  assertEquals(w.ranges(DRIVES), [VEHICLE]);
  assertEquals(w.isA(8, PERSON), true);
  assertEquals(w.isA(9, VEHICLE), true);
  assertEquals(w.linked(8, IS), [PERSON]);
  assertEquals(w.members(VEHICLE, IS), [9]);
  assertEquals(w.term(8).links.some((link) => link.rel === IS), false, "inference did not mutate data");
});

test("subrelations inherit constraints and converses exchange their sides", () => {
  const RELATION = 2;
  const PERSON = 3;
  const VEHICLE = 4;
  const OPERATES = 5;
  const PILOTS = 6;
  const OWNS = 7;
  const BELONGS = 8;
  const DOMAIN = 10;
  const RANGE = 11;
  const SUBRELATION = 12;
  const CONVERSE = 13;
  const w = fromWorldData({
    anchors: { relation: RELATION, domain: DOMAIN, range: RANGE, subrelation: SUBRELATION, converse: CONVERSE },
    relations: { is: IS },
    terms: [
      { id: IS, name: "is", links: [{ rel: IS, to: RELATION }] },
      { id: RELATION, name: "relation", links: [] },
      { id: PERSON, name: "person", links: [] },
      { id: VEHICLE, name: "vehicle", links: [] },
      { id: OPERATES, name: "operates", links: [{ rel: IS, to: RELATION }, { rel: DOMAIN, to: PERSON }, { rel: RANGE, to: VEHICLE }] },
      { id: PILOTS, name: "pilots", links: [{ rel: IS, to: RELATION }, { rel: SUBRELATION, to: OPERATES }] },
      { id: OWNS, name: "owns", links: [{ rel: IS, to: RELATION }, { rel: DOMAIN, to: PERSON }, { rel: RANGE, to: VEHICLE }, { rel: CONVERSE, to: BELONGS }] },
      { id: BELONGS, name: "belongs", links: [{ rel: IS, to: RELATION }] },
      { id: DOMAIN, name: "domain", links: [{ rel: IS, to: RELATION }] },
      { id: RANGE, name: "range", links: [{ rel: IS, to: RELATION }] },
      { id: SUBRELATION, name: "subrelation", links: [{ rel: IS, to: RELATION }] },
      { id: CONVERSE, name: "converse", links: [{ rel: IS, to: RELATION }] },
      { id: 14, name: "alice", individual: true, links: [{ rel: PILOTS, to: 15 }] },
      { id: 15, name: "car", individual: true, links: [{ rel: BELONGS, to: 16 }] },
      { id: 16, name: "bob", individual: true, links: [] },
    ],
  });
  assertEquals(w.domains(PILOTS), [PERSON]);
  assertEquals(w.ranges(PILOTS), [VEHICLE]);
  assertEquals(w.domains(BELONGS), [VEHICLE]);
  assertEquals(w.ranges(BELONGS), [PERSON]);
  assertEquals(w.isA(14, PERSON), true);
  assertEquals(w.isA(15, VEHICLE), true);
  assertEquals(w.isA(16, PERSON), true);
});

test("denied relation facts imply no domain or range classifications", () => {
  const DOMAIN = 5;
  const RANGE = 6;
  const w = fromWorldData({
    anchors: { domain: DOMAIN, range: RANGE },
    relations: { is: IS },
    terms: [
      { id: IS, name: "is", links: [] },
      { id: 2, name: "person", links: [] },
      { id: 3, name: "vehicle", links: [] },
      { id: 4, name: "drives", links: [{ rel: DOMAIN, to: 2 }, { rel: RANGE, to: 3 }] },
      { id: DOMAIN, name: "domain", links: [] },
      { id: RANGE, name: "range", links: [] },
      { id: 7, name: "alice", links: [{ rel: 4, to: 8, not: true }] },
      { id: 8, name: "car", links: [] },
    ],
  });
  assertEquals(w.isA(7, 2), false);
  assertEquals(w.isA(8, 3), false);
});

test("domain and range bound the universe of a reflexive relation", () => {
  const PERSON = 2;
  const REFLECTS = 3;
  const DOMAIN = 4;
  const RANGE = 5;
  const w = fromWorldData({
    anchors: { domain: DOMAIN, range: RANGE },
    relations: { is: IS },
    terms: [
      { id: IS, name: "is", links: [] },
      { id: PERSON, name: "person", links: [] },
      { id: REFLECTS, name: "reflects", reflexive: true, links: [{ rel: DOMAIN, to: PERSON }, { rel: RANGE, to: PERSON }] },
      { id: DOMAIN, name: "domain", links: [] },
      { id: RANGE, name: "range", links: [] },
      { id: 6, name: "alice", links: [{ rel: IS, to: PERSON }] },
      { id: 7, name: "stone", links: [] },
    ],
  });
  assertEquals(w.isA(6, 6, REFLECTS), true);
  assertEquals(w.isA(7, 7, REFLECTS), false);
});

test("subtype and instance are distinct while the broad kind walk composes them", () => {
  const RELATION = 2;
  const SUBTYPE = 3;
  const INSTANCE = 4;
  const SUBRELATION = 5;
  const ANIMAL = 6;
  const DOG = 7;
  const FIDO = 8;
  const w = fromWorldData({
    anchors: { relation: RELATION, subtype: SUBTYPE, instance: INSTANCE, subrelation: SUBRELATION },
    relations: { is: IS },
    terms: [
      { id: IS, name: "is", links: [{ rel: IS, to: RELATION }] },
      { id: RELATION, name: "relation", links: [] },
      { id: SUBTYPE, name: "subtype", transitive: true, asymmetric: true, links: [{ rel: IS, to: RELATION }, { rel: SUBRELATION, to: IS }] },
      { id: INSTANCE, name: "instance", irreflexive: true, links: [{ rel: IS, to: RELATION }, { rel: SUBRELATION, to: IS }] },
      { id: SUBRELATION, name: "subrelation", links: [{ rel: IS, to: RELATION }] },
      { id: ANIMAL, name: "animal", links: [] },
      { id: DOG, name: "dog", links: [{ rel: SUBTYPE, to: ANIMAL }] },
      { id: FIDO, name: "fido", individual: true, links: [{ rel: INSTANCE, to: DOG }] },
    ],
  });
  assertEquals(w.isA(DOG, ANIMAL, SUBTYPE), true);
  assertEquals(w.isA(FIDO, DOG, INSTANCE), true);
  assertEquals(w.isA(FIDO, ANIMAL, INSTANCE), false, "membership itself is not transitive");
  assertEquals(w.isA(FIDO, ANIMAL), true, "the broad kind walk composes membership and subtype");
  assertEquals(w.linked(FIDO, IS), [DOG]);
  assertEquals(w.individualsOf(DOG), [FIDO]);
  assertEquals(w.oneOf(DOG), FIDO);
});

test("classification denials remain visible through the broad is relation", () => {
  const INSTANCE = 3;
  const w = fromWorldData({
    anchors: { instance: INSTANCE },
    relations: { is: IS },
    terms: [
      { id: IS, name: "is", links: [] },
      { id: 2, name: "animal", links: [] },
      { id: INSTANCE, name: "instance", links: [] },
      { id: 4, name: "stone", individual: true, links: [{ rel: INSTANCE, to: 2, not: true }] },
    ],
  });
  assertEquals(w.denies(4, 2, IS), true);
});

test("property predication answers broad is without classifying its subject as a property", () => {
  const THING = 2;
  const PROPERTY = 3;
  const COLOUR = 4;
  const BLUE = 5;
  const PREDICATION = 6;
  const SKY = 7;
  const w = fromWorldData({
    anchors: { thing: THING, property: PROPERTY, predication: PREDICATION },
    relations: { is: IS },
    terms: [
      { id: IS, name: "is", links: [] },
      { id: THING, name: "thing", links: [] },
      { id: PROPERTY, name: "property", links: [] },
      { id: COLOUR, name: "colour", links: [{ rel: IS, to: PROPERTY }] },
      { id: BLUE, name: "blue", links: [{ rel: IS, to: COLOUR }] },
      { id: PREDICATION, name: "predication", links: [] },
      { id: SKY, name: "sky", links: [{ rel: IS, to: THING }, { rel: PREDICATION, to: BLUE }] },
    ],
  });
  assertEquals(w.isA(SKY, BLUE), true, "broad surface compatibility remains");
  assertEquals(w.isA(SKY, BLUE, PREDICATION), true);
  assertEquals(w.isA(SKY, PROPERTY), false, "a predicate is not a supertype");
  assertEquals(w.kinds(SKY), [THING]);
  assertEquals(w.linked(SKY, IS), [THING, BLUE], "the broad direct answer remains compatible");
});

test("legacy broad property edges receive the same non-classifying semantics", () => {
  const THING = 2;
  const PROPERTY = 3;
  const BLUE = 4;
  const PREDICATION = 5;
  const SKY = 6;
  const SUBTYPE = 7;
  const w = fromWorldData({
    anchors: { thing: THING, property: PROPERTY, predication: PREDICATION, subtype: SUBTYPE },
    relations: { is: IS },
    terms: [
      { id: IS, name: "is", links: [] },
      { id: THING, name: "thing", links: [] },
      { id: PROPERTY, name: "property", links: [] },
      { id: BLUE, name: "blue", links: [{ rel: IS, to: PROPERTY }] },
      { id: PREDICATION, name: "predication", links: [] },
      { id: SKY, name: "sky", links: [{ rel: IS, to: THING }, { rel: IS, to: BLUE }] },
      { id: SUBTYPE, name: "subtype", links: [] },
    ],
  });
  assertEquals(w.isA(SKY, BLUE), true);
  assertEquals(w.isA(SKY, BLUE, PREDICATION), true);
  assertEquals(w.isA(SKY, PROPERTY), false);
  assertEquals(w.kinds(SKY), [THING]);
  assertEquals(w.isA(BLUE, PROPERTY, SUBTYPE), true, "legacy taxonomy reads as subtype");
});

test("transitive relations compose facts written through a converse", () => {
  const BEFORE = 2;
  const AFTER = 3;
  const CONVERSE = 4;
  const w = fromWorldData({
    anchors: { converse: CONVERSE },
    relations: { is: IS },
    terms: [
      { id: IS, name: "is", links: [] },
      { id: BEFORE, name: "one direction", transitive: true, links: [{ rel: CONVERSE, to: AFTER }] },
      { id: AFTER, name: "the other direction", transitive: true, links: [] },
      { id: CONVERSE, name: "converse", links: [] },
      { id: 5, name: "a", links: [{ rel: BEFORE, to: 6 }] },
      { id: 6, name: "b", links: [] },
      { id: 7, name: "c", links: [{ rel: AFTER, to: 6 }] },
    ],
  });
  assertEquals(w.isA(5, 7, BEFORE), true, "a before b and c after b means a before c");
  assertEquals(w.isA(7, 5, AFTER), true, "the same path is readable from its converse");
});
