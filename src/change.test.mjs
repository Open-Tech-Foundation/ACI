import { test, assert, assertEquals } from "runtime:test";
import { fromWorldData } from "./world.js";
import { learningConflict } from "./brain.js";

// Weighing a change against the world it would join.
//
// The world it joins is whole already, so what is walked is what the change
// touches. These say the rules it is still held to, one apiece.

const IS = 1;
const SAME = 2;
const DIFFERENT = 3;
const BEFORE = 4;
const PROPERTY = 20;

const data = {
  anchors: {
    thing: 10,
    property: PROPERTY,
    relation: 11,
    same: SAME,
    different: DIFFERENT,
    subtype: 5,
    instance: 6,
    predication: 7,
  },
  relations: { is: IS, same: SAME, different: DIFFERENT },
  terms: [
    { id: IS, name: "is", links: [] },
    { id: SAME, name: "same", links: [{ rel: IS, to: 11 }], symmetric: true, reflexive: true, transitive: true },
    { id: DIFFERENT, name: "different", links: [{ rel: IS, to: 11 }], symmetric: true, irreflexive: true },
    { id: BEFORE, name: "before", links: [{ rel: IS, to: 11 }], asymmetric: true, transitive: true },
    { id: 5, name: "subtype", links: [{ rel: IS, to: 11 }] },
    { id: 6, name: "instance", links: [{ rel: IS, to: 11 }] },
    { id: 7, name: "predication", links: [{ rel: IS, to: 11 }] },
    { id: 10, name: "thing", links: [], disjoint: true },
    { id: 11, name: "relation", links: [] },
    { id: PROPERTY, name: "property", links: [] },
    { id: 21, name: "blue", links: [{ rel: IS, to: PROPERTY }] },
    { id: 30, name: "animal", links: [{ rel: IS, to: 10 }], disjoint: true },
    { id: 31, name: "crow", links: [{ rel: IS, to: 30 }] },
    { id: 32, name: "eel", links: [{ rel: IS, to: 30 }] },
  ],
};
const world = fromWorldData(data);
const change = (...terms) => learningConflict(world, { terms });
const one = (id, name, links) => ({ id, name, links });

test("a change that bears on nothing already there is taken", () => {
  assertEquals(change(one(100, "nila", [{ rel: IS, to: 31 }])), null);
});

test("one term may not hold and deny the same thing", () => {
  assert(change(one(100, "nila", [{ rel: IS, to: 31 }, { rel: IS, to: 31, not: true }])));
});

test("a link may not name a term that is not there", () => {
  assert(change(one(100, "nila", [{ rel: IS, to: 999 }])));
  assert(change(one(100, "nila", [{ rel: 999, to: 31 }])));
});

test("a name already given belongs to what was given it", () => {
  assert(change(one(100, "crow", [])));
});

test("a relation that runs one way runs neither to itself nor both ways", () => {
  assert(change(one(100, "nila", [{ rel: BEFORE, to: 100 }])));
  assert(change(
    one(100, "nila", [{ rel: BEFORE, to: 101 }]),
    one(101, "ilan", [{ rel: BEFORE, to: 100 }]),
  ));
});

test("nor round to where it started, however long the way", () => {
  assert(change(
    one(100, "nila", [{ rel: BEFORE, to: 101 }]),
    one(101, "ilan", [{ rel: BEFORE, to: 102 }]),
    one(102, "amar", [{ rel: BEFORE, to: 100 }]),
  ));
});

test("a symmetric fact and its mirror are one fact, and agree", () => {
  assert(change(
    one(100, "nila", [{ rel: DIFFERENT, to: 101 }]),
    one(101, "ilan", [{ rel: DIFFERENT, to: 100, not: true }]),
  ));
  assertEquals(
    change(
      one(100, "nila", [{ rel: DIFFERENT, to: 101 }]),
      one(101, "ilan", [{ rel: DIFFERENT, to: 100 }]),
    ),
    null,
    "said twice the same way, it is said once",
  );
});

test("a kind may not be one of itself through another", () => {
  assert(change(
    one(100, "nila", [{ rel: IS, to: 101 }]),
    one(101, "ilan", [{ rel: IS, to: 100 }]),
  ));
});

test("what is said of a thing must be a property to be predicated", () => {
  assert(change(one(100, "nila", [{ rel: 7, to: 31 }])), "a crow is not a property");
  assertEquals(change(one(100, "nila", [{ rel: 7, to: 21 }])), null, "blue is");
});

test("one thing under two names may not be two exclusive things", () => {
  assert(change(
    one(100, "nila", [{ rel: IS, to: 31 }]),
    one(101, "ilan", [{ rel: IS, to: 32 }, { rel: SAME, to: 100 }]),
  ));
  assertEquals(
    change(
      one(100, "nila", [{ rel: IS, to: 31 }]),
      one(101, "ilan", [{ rel: IS, to: 31 }, { rel: SAME, to: 100 }]),
    ),
    null,
  );
});

test("a change is weighed against what the world already holds, not only itself", () => {
  const held = fromWorldData({
    ...data,
    terms: [...data.terms, one(100, "nila", [{ rel: BEFORE, to: 101 }]), one(101, "ilan", [])],
  });
  assert(
    learningConflict(held, { terms: [one(101, "ilan", [{ rel: BEFORE, to: 100 }])] }),
    "the other half of it was already there",
  );
});
