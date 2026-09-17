import { test, assert, assertEquals } from "runtime:test";
import { fromSources } from "./knowledge.js";
import { openBrain } from "./index.js";

// A claim is held the way an occurrence is held: something that exists once,
// which is an instance of what it claims, and which says which two things
// stand in it. Nothing new carries it — a relation is a term, a role is a
// relation, and denying the claim is the `not` every link already has.
const IS = 9, RELATION = 2, THING = 1;
const SUBJECT = 20, OBJECT = 21, TALLER = 22, ALICE = 23, BOB = 24, KNOWS = 25;

const worldWith = (extra) => fromSources({
  world: {
    anchors: { thing: THING, relation: RELATION, subject: SUBJECT, object: OBJECT },
    relations: { is: IS },
    terms: [
      { id: THING, name: "thing", links: [] },
      { id: RELATION, name: "relation", links: [] },
      { id: IS, name: "is", links: [{ rel: IS, to: RELATION }] },
      { id: SUBJECT, name: "claim-subject", links: [{ rel: IS, to: RELATION }] },
      { id: OBJECT, name: "claim-object", links: [{ rel: IS, to: RELATION }] },
      { id: TALLER, name: "taller", links: [{ rel: IS, to: RELATION }] },
      { id: KNOWS, name: "knows", links: [{ rel: IS, to: RELATION }] },
      { id: ALICE, name: "alice", individual: true, links: [{ rel: IS, to: THING }] },
      { id: BOB, name: "bob", individual: true, links: [{ rel: IS, to: THING }] },
      ...extra,
    ],
  },
}).world;

// alice is taller than bob, held as a thing rather than as an edge
const claim = (id, extra = []) => ({
  id, name: `claim-${id}`, individual: true,
  links: [{ rel: IS, to: TALLER }, { rel: SUBJECT, to: ALICE }, { rel: OBJECT, to: BOB }, ...extra],
});

test("a claim says what it claims, of what, and either way round", () => {
  const w = worldWith([claim(30)]);
  assertEquals(w.claimOf(30), { subject: ALICE, relation: TALLER, object: BOB, not: false, at: null });
});

test("denying the claim is denying that it is one", () => {
  const w = worldWith([{
    id: 30, name: "claim-30", individual: true,
    links: [{ rel: IS, to: TALLER, not: true }, { rel: SUBJECT, to: ALICE }, { rel: OBJECT, to: BOB }],
  }]);
  assertEquals(w.claimOf(30).not, true, "the polarity every link already has");
  assertEquals(w.claimOf(30).relation, TALLER, "and it is still a claim about the same thing");
});

test("a claim is a thing, so anything may be said of it", () => {
  // carl knows it. The claim is the object of another fact, which is the whole
  // point of holding it as a thing rather than as an edge.
  const KNOWER = 27;
  const w = worldWith([claim(30), {
    id: KNOWER, name: "the one who knows", individual: true,
    links: [{ rel: IS, to: THING }, { rel: KNOWS, to: 30 }],
  }]);
  assertEquals(w.linked(KNOWER, KNOWS), [30], "what is known is the claim itself");
  assertEquals(w.claimOf(w.linked(KNOWER, KNOWS)[0]).subject, ALICE, "and it can be read back");
});

test("holding a claim does not make it so", () => {
  const w = worldWith([claim(30)]);
  assertEquals(w.isA(ALICE, BOB, TALLER), false, "the world was not made to agree with it");
});

test("what is not a claim reaches nothing, and that is not a failure", () => {
  const w = worldWith([claim(30)]);
  assertEquals(w.claimOf(ALICE), null, "an ordinary thing claims nothing");
  assertEquals(w.claimOf(TALLER), null, "nor does a relation");
  assertEquals(w.claimOf(9999), null, "nor does a term that is not there");
});

test("a claim with only one end is not yet a claim", () => {
  const w = worldWith([{
    id: 30, name: "claim-30", individual: true,
    links: [{ rel: IS, to: TALLER }, { rel: SUBJECT, to: ALICE }],
  }]);
  assertEquals(w.claimOf(30), null, "nothing is claimed of nothing");
});

// And the same, said to a brain that has a whole world under it.
const { brain, forget } = openBrain("sqlite::memory:");
const PERSON = 29;

test("a claim somebody holds is a thing the brain holds, and not a claim it makes", async () => {
  // `omar said that the ferry is late` says omar said it. It does not say the
  // ferry is late — writing the claim down as a fact of the conversation left
  // the brain holding what nobody told it.
  await forget();
  await brain("omar said that the ferry is late", { from: PERSON });
  assertEquals((await brain("is the ferry late?", { from: PERSON })).expression.name, "unsure");
  assertEquals((await brain("did omar say that the ferry is late?", { from: PERSON })).expression.name, "affirm");
  await forget();
});

test("a thing this very signal made is already the one it is", async () => {
  // The name made omar, and then the claim-holder walk made a second thing
  // standing for the first and joined that to the claim — which the world then
  // refused, because the second pointed at a term nothing was writing down.
  await forget();
  const r = await brain("omar said that the ferry is late", { from: PERSON });
  assertEquals(r.expression.name, "learn", "taken in, not refused as inconsistent");
  await forget();
});

test("what the brain holds, it can see it holds", async () => {
  // Asked whether it knows something, the brain was looking for a claim
  // somebody had written down and saying it did not know when it found none.
  // It holds what it holds: not holding a claim is a no, never a not-knowing.
  await forget();
  assertEquals((await brain("do you know that a mango is a fruit?")).expression.name, "affirm");
  assertEquals((await brain("do you know that the ferry is late?")).expression.name, "deny");
  assertEquals((await brain("do you know that a mango is a hammer?")).expression.name, "deny");
  await forget();
});
