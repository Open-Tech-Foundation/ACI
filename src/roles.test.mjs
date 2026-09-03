import { test, assertEquals } from "runtime:test";
import { brainFrom } from "./brain.js";
import { fromSources } from "./knowledge.js";

// Which side of an action the doer falls on is word order, and word order is the
// language's. The same world, the same signal, two languages that disagree.
const IS = 90;
const AGENT = 6;
const TARGET = 7;
const world = {
  anchors: { thing: 1, relation: 2, action: 3, agent: AGENT, target: TARGET },
  relations: { is: IS },
  terms: [
    { id: 1, name: "thing", links: [] },
    { id: 2, name: "relation", links: [] },
    { id: 3, name: "action", links: [] },
    { id: AGENT, name: "agent", links: [{ rel: IS, to: 2 }] },
    { id: TARGET, name: "target", links: [{ rel: IS, to: 2 }] },
    { id: IS, name: "is", links: [{ rel: IS, to: 2 }] },
    { id: 10, name: "wheel", links: [{ rel: IS, to: 1 }] },
    { id: 20, name: "wash", links: [{ rel: IS, to: 3 }] },
  ],
};

const language = (parts) => ({
  name: "test",
  symbols: { letter: { characters: "abcdefghijklmnopqrstuvwxyz" } },
  words: {
    wheel: { pos: "noun", meaning: "wheel", concept: 10 },
    wash: { pos: "verb", meaning: "wash", concept: 20 },
  },
  parts,
  grammar: {
    start: "sentence",
    rules: { sentence: { rules: ["verb subject"] }, subject: { rules: ["noun"] } },
  },
});

const partsOf = (parts) => {
  const knowledge = fromSources({ world, languages: [language(parts)] });
  const event = (brainFrom("wash wheel", knowledge).roots[0].branch || []).find(
    (b) => b.kind === "event",
  );
  return event ? event.state.parts : null;
};

test("a language that puts the doer first makes what follows the target", () => {
  assertEquals(partsOf({ before: "agent", after: "target" }), [
    { role: TARGET, of: 10, amount: null },
  ]);
});

test("a language that puts it last reads the same signal the other way", () => {
  assertEquals(partsOf({ before: "target", after: "agent" }), [
    { role: AGENT, of: 10, amount: null },
  ]);
});

test("told nothing about word order, the brain assigns no part at all", () => {
  assertEquals(partsOf(undefined), null, "and so nothing happened");
});
