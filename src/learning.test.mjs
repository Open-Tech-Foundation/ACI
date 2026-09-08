import { test, assert, assertEquals } from "runtime:test";
import { learningConflict } from "./brain.js";
import { fromSources } from "./knowledge.js";
import { checkWhole } from "./shape.js";

// The brain weighs a proposed change against the world before accepting it,
// and the shape check walks the world it would become. They are two readings of
// one set of invariants, and the store is only spared the second because the
// first is trusted — so what they must never do is disagree.
//
// The world is opaque on purpose: none of this is about any language, and none
// of it is about which term happens to mean what.
const IS = 9, RELATION = 2, THING = 1;
const SUBTYPE = 20, INSTANCE = 21, PREDICATION = 22, SUBRELATION = 23;
const SAME = 24, DIFFERENT = 25, DOMAIN = 26, RANGE = 27, CONVERSE = 28;
const ORDER = 30, PAIRED = 31, POINTS = 32, MIRRORS = 33, PROPERTY = 34;
const COLOUR = 35, KIND = 36, OTHER = 37, ONE = 38, HOLDS = 39;

const worldData = {
  anchors: {
    thing: THING, relation: RELATION, property: PROPERTY, subtype: SUBTYPE,
    instance: INSTANCE, predication: PREDICATION, subrelation: SUBRELATION,
    same: SAME, different: DIFFERENT, domain: DOMAIN, range: RANGE, converse: CONVERSE,
  },
  relations: { is: IS, same: SAME, different: DIFFERENT },
  terms: [
    { id: THING, name: "thing", links: [] },
    { id: RELATION, name: "relation", links: [] },
    { id: IS, name: "is", links: [{ rel: IS, to: RELATION }] },
    { id: SUBTYPE, name: "subtype", transitive: true, asymmetric: true, links: [{ rel: IS, to: RELATION }, { rel: SUBRELATION, to: IS }] },
    { id: INSTANCE, name: "instance", irreflexive: true, links: [{ rel: IS, to: RELATION }, { rel: SUBRELATION, to: IS }] },
    { id: PREDICATION, name: "predication", links: [{ rel: IS, to: RELATION }] },
    { id: SUBRELATION, name: "subrelation", transitive: true, asymmetric: true, links: [{ rel: IS, to: RELATION }] },
    { id: SAME, name: "identity", symmetric: true, reflexive: true, transitive: true, links: [{ rel: IS, to: RELATION }] },
    { id: DIFFERENT, name: "distinction", symmetric: true, irreflexive: true, links: [{ rel: IS, to: RELATION }] },
    { id: DOMAIN, name: "domain", links: [{ rel: IS, to: RELATION }] },
    { id: RANGE, name: "range", links: [{ rel: IS, to: RELATION }] },
    { id: CONVERSE, name: "converse", links: [{ rel: IS, to: RELATION }] },
    { id: ORDER, name: "ordering", transitive: true, asymmetric: true, links: [{ rel: IS, to: RELATION }] },
    { id: PAIRED, name: "pairing", symmetric: true, links: [{ rel: IS, to: RELATION }] },
    { id: POINTS, name: "pointing", functional: true, links: [{ rel: IS, to: RELATION }] },
    { id: MIRRORS, name: "mirroring", reflexive: true, links: [{ rel: IS, to: RELATION }] },
    { id: HOLDS, name: "holding", links: [{ rel: IS, to: RELATION }] },
    { id: PROPERTY, name: "property", links: [{ rel: IS, to: THING }] },
    { id: COLOUR, name: "colour", links: [{ rel: SUBTYPE, to: PROPERTY }] },
    { id: KIND, name: "kind", links: [{ rel: IS, to: THING }] },
    { id: OTHER, name: "other kind", links: [{ rel: IS, to: THING }, { rel: DIFFERENT, to: KIND }] },
    { id: ONE, name: "one of a kind", individual: true, links: [{ rel: INSTANCE, to: KIND }] },
  ],
};

const world = fromSources({ world: worldData }).world;
const NEW = 50;

// The world the change would make, assembled the way the store assembles it.
const after = (learned) => {
  const terms = worldData.terms.map((t) => ({ ...t, links: t.links.map((l) => ({ ...l })) }));
  const byId = new Map(terms.map((t) => [t.id, t]));
  for (const proposed of learned.terms || []) {
    if (!byId.has(proposed.id)) {
      const made = { ...proposed, links: [] };
      terms.push(made);
      byId.set(proposed.id, made);
    }
    byId.get(proposed.id).links.push(...(proposed.links || []).map((l) => ({ ...l })));
  }
  return { ...worldData, terms };
};

const walked = (learned) => {
  try {
    checkWhole(after(learned));
    return null;
  } catch (why) {
    return why.message;
  }
};

const one = (id, links, extra = {}) => ({ terms: [{ id, name: `made-${id}`, individual: true, links, ...extra }] });

// Every change below is named by the wall it is meant to meet, or by the fact
// that it meets none. What matters is not which message comes back — the two
// readings word things differently — but that they agree there is something
// wrong, or agree there is not.
const changes = {
  "a plain new fact": one(NEW, [{ rel: INSTANCE, to: KIND }]),
  "a fact about a term already there": { terms: [{ id: ONE, name: "one of a kind", links: [{ rel: HOLDS, to: KIND }] }] },
  "a denial": one(NEW, [{ rel: INSTANCE, to: KIND }, { rel: HOLDS, to: OTHER, not: true }]),
  "a quantity": one(NEW, [{ rel: HOLDS, to: KIND, quantity: 3, at: 1 }]),
  "a name already taken": { terms: [{ id: NEW, name: "kind", individual: true, links: [] }] },
  "a link to nothing": one(NEW, [{ rel: IS, to: 9999 }]),
  "a link made of nothing": one(NEW, [{ rel: 9999, to: KIND }]),
  "holding and denying one fact": one(NEW, [{ rel: HOLDS, to: KIND }, { rel: HOLDS, to: KIND, not: true }]),
  "two quantities for one fact": one(NEW, [{ rel: HOLDS, to: KIND, quantity: 1 }, { rel: HOLDS, to: KIND, quantity: 2 }]),
  "an irreflexive self-link": one(NEW, [{ rel: DIFFERENT, to: NEW }]),
  "an asymmetric self-link": one(NEW, [{ rel: ORDER, to: NEW }]),
  "an asymmetric pair both ways": { terms: [
    { id: NEW, name: `made-${NEW}`, individual: true, links: [{ rel: ORDER, to: KIND }] },
    { id: KIND, name: "kind", links: [{ rel: ORDER, to: NEW }] },
  ] },
  "a classification cycle": { terms: [{ id: KIND, name: "kind", links: [{ rel: SUBTYPE, to: KIND }] }] },
  "a longer classification cycle": { terms: [
    { id: KIND, name: "kind", links: [{ rel: SUBTYPE, to: NEW }] },
    { id: NEW, name: `made-${NEW}`, links: [{ rel: SUBTYPE, to: KIND }] },
  ] },
  "subtype from an individual": one(NEW, [{ rel: SUBTYPE, to: KIND }]),
  "instance onto an individual": one(NEW, [{ rel: INSTANCE, to: ONE }]),
  "predication of something that is not a property": one(NEW, [{ rel: PREDICATION, to: KIND }]),
  "predication of a property": one(NEW, [{ rel: PREDICATION, to: COLOUR }]),
  "domain on something that is not a relation": { terms: [{ id: KIND, name: "kind", links: [{ rel: DOMAIN, to: KIND }] }] },
  "range naming an individual": { terms: [{ id: HOLDS, name: "holding", links: [{ rel: RANGE, to: ONE }] }] },
  "a symmetric fact held and denied": { terms: [
    { id: NEW, name: `made-${NEW}`, individual: true, links: [{ rel: PAIRED, to: KIND }] },
    { id: KIND, name: "kind", links: [{ rel: PAIRED, to: NEW, not: true }] },
  ] },
  "a symmetric fact agreeing both ways": { terms: [
    { id: NEW, name: `made-${NEW}`, individual: true, links: [{ rel: PAIRED, to: KIND }] },
    { id: KIND, name: "kind", links: [{ rel: PAIRED, to: NEW }] },
  ] },
  "a functional relation given two objects": one(NEW, [{ rel: POINTS, to: KIND }, { rel: POINTS, to: OTHER }]),
  "a functional relation given one object": one(NEW, [{ rel: POINTS, to: KIND }]),
  "a functional relation stamped twice": one(NEW, [{ rel: POINTS, to: KIND, at: 1 }, { rel: POINTS, to: OTHER, at: 2 }]),
  "a reflexive self-link denied": one(NEW, [{ rel: MIRRORS, to: NEW, not: true }]),
  "identity with an excluded kind": one(NEW, [{ rel: INSTANCE, to: KIND }, { rel: SAME, to: ONE }, { rel: DIFFERENT, to: ONE }]),
  "identity denied and held at once": one(NEW, [{ rel: SAME, to: ONE }, { rel: SAME, to: ONE, not: true }]),
  "a narrower fact against a denied broader one": one(NEW, [{ rel: SUBTYPE, to: KIND }, { rel: IS, to: KIND, not: true }], { individual: false }),
};

test("the brain's wall and the shape check agree on every change", () => {
  const split = [];
  for (const [what, learned] of Object.entries(changes)) {
    const brain = learningConflict(world, learned);
    const shape = walked(learned);
    if ((brain == null) !== (shape == null)) {
      split.push(`${what}: brain ${brain == null ? "accepted" : `refused (${brain})`}, shape ${shape == null ? "accepted" : `refused (${shape})`}`);
    }
  }
  assertEquals(split, [], "the two readings of one set of invariants disagree");
});

// A term already there keeps its name: the store writes a term only when it is
// not there yet, so a change proposing a new name for an old id would be
// dropped on the way in and the world would look untouched. The shape check
// walks that untouched world and sees nothing wrong — it never learns what was
// asked for. So this is the brain's alone to refuse, and it must, or the
// rename goes missing in silence.
test("the brain refuses a rename the store would drop without a word", () => {
  const rename = { terms: [{ id: KIND, name: "not kind", links: [] }] };
  assert(learningConflict(world, rename) != null, "the brain let a silent rename through");
  assertEquals(walked(rename), null, "and the world it would make looks whole, which is the point");
});

test("and between them they refuse what should be refused", () => {
  const allowed = new Set([
    "a plain new fact",
    "a fact about a term already there",
    "a denial",
    "a quantity",
    "predication of a property",
    "a symmetric fact agreeing both ways",
    "a functional relation given one object",
    "a functional relation stamped twice",
  ]);
  for (const [what, learned] of Object.entries(changes)) {
    const refused = learningConflict(world, learned) != null;
    assertEquals(refused, !allowed.has(what), `${what} was ${refused ? "refused" : "accepted"}`);
  }
});
