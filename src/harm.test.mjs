import { test, assert, assertEquals } from "runtime:test";
import { brainFrom } from "./brain.js";
import { fromSources } from "./knowledge.js";
import { openBrain } from "./index.js";

// A world of its own, small enough to see all of: two actions, one of them a
// kind of bad, one of them causing something bad, and a thing to do them to.
const IS = 90;
const CAUSE = 5;
const worldData = {
  anchors: { thing: 1, relation: 2, action: 3, bad: 4, cause: CAUSE, agent: 6, patient: 7 },
  relations: { is: IS, cause: CAUSE },
  terms: [
  { id: 1, name: "thing", links: [] },
  { id: 2, name: "relation", links: [] },
  { id: 3, name: "action", links: [] },
  { id: 4, name: "bad", links: [{ rel: IS, to: 1 }] },
  { id: 5, name: "cause", links: [{ rel: IS, to: 2 }] },
  { id: 6, name: "agent", links: [{ rel: IS, to: 2 }] },
  { id: 7, name: "patient", links: [{ rel: IS, to: 2 }] },
  { id: 90, name: "is", links: [{ rel: IS, to: 2 }] },
  { id: 10, name: "wheel", links: [{ rel: IS, to: 1 }] },
  { id: 20, name: "wash", links: [{ rel: IS, to: 3 }] },
  { id: 21, name: "burn", links: [{ rel: IS, to: 3 }, { rel: IS, to: 4 }] },
  { id: 22, name: "crush", links: [{ rel: IS, to: 3 }, { rel: CAUSE, to: 23 }] },
  { id: 23, name: "ache", links: [{ rel: IS, to: 1 }, { rel: IS, to: 4 }] },
  ],
};

const langData = {
  name: "test",
  symbols: { letter: { characters: "abcdefghijklmnopqrstuvwxyz" } },
  words: {
  wheel: { pos: "noun", meaning: "wheel", concept: 10 },
  wash: { pos: "verb", meaning: "wash", concept: 20 },
  burn: { pos: "verb", meaning: "burn", concept: 21 },
  crush: { pos: "verb", meaning: "crush", concept: 22 },
  },
  expressions: { deny: "No.", understood: "I know.", unknown: "..." },
  grammar: {
  start: "sentence",
  rules: {
      sentence: { rules: ["verb subject"] },
      subject: { rules: ["noun"] },
  },
  },
};

const knowledge = fromSources({ world: worldData, languages: [langData] });
const answered = (q) => brainFrom(q, knowledge);
const branchOf = (r, kind) => (r.roots[0].branch || []).find((b) => b.kind === kind) || null;

test("an act the world says nothing against happens and is recorded", () => {
  const r = answered("wash wheel");
  assert(branchOf(r, "event") !== null, "it happened");
  assertEquals(branchOf(r, "refuse"), null);
});

test("an act that is bad is refused, and does not go on the record", () => {
  const r = answered("burn wheel");
  assertEquals(branchOf(r, "refuse").name, "harm");
  assertEquals(branchOf(r, "event"), null, "nothing happened");
  assertEquals(r.expression.state.says, "No.");
});

test("an act that causes something bad is refused the same way", () => {
  const r = answered("crush wheel");
  assertEquals(branchOf(r, "refuse").name, "harm");
  assertEquals(branchOf(r, "event"), null);
});

test("a world that calls nothing bad has nothing to refuse", () => {
  const { bad, ...rest } = worldData.anchors;
  const blind = fromSources({
  world: { ...worldData, anchors: rest },
  languages: [langData],
  });
  const r = brainFrom("burn wheel", blind);
  assert((r.roots[0].branch || []).some((b) => b.kind === "event"), "it happened");
});

// The same filter over the world the brain actually runs on, and over knowledge
// it was taught rather than seeded with.
const { brain } = openBrain("sqlite::memory:");

test("an answer that harms is refused, whatever else fits", async () => {
  assertEquals((await brain("a doctor has anger")).expression.state.says, "I know.");
  assertEquals((await brain("a doctor has what?")).expression.state.says, "anger");
  assertEquals((await brain("anger is bad")).expression.state.says, "I know.");
  const r = await brain("a doctor has what?");
  assertEquals((r.roots[0].branch || []).find((b) => b.kind === "refuse").name, "harm");
  assertEquals(r.expression.state.says, "No.");
  // What it looked for is still on the tree; saying it is what it will not do.
  assertEquals((r.roots[0].branch || []).find((b) => b.kind === "answer").state.found, [233]);
});

test("a claim about an action is a claim, not the action happening", async () => {
  const r = await brain("catch is bad");
  assert((r.roots[0].branch || []).some((b) => b.kind === "truth"), "it was judged");
  assert(!(r.roots[0].branch || []).some((b) => b.kind === "event"), "nothing happened");
});
