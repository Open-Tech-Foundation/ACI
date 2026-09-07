import { test, assert, assertEquals } from "runtime:test";
import { brainFrom } from "./brain.js";
import { fromSources } from "./knowledge.js";

const IS = 90;
const SOURCE = 6;
const AGENT = 7;
const TARGET = 8;
const world = {
  anchors: {
    thing: 1,
    relation: 2,
    action: 3,
    source: SOURCE,
    agent: AGENT,
    target: TARGET,
  },
  relations: { is: IS },
  terms: [
    { id: 1, name: "thing", links: [] },
    { id: 2, name: "relation", links: [] },
    { id: 3, name: "action", links: [] },
    { id: SOURCE, name: "source", links: [{ rel: IS, to: 2 }] },
    { id: AGENT, name: "agent", links: [{ rel: IS, to: 2 }] },
    { id: TARGET, name: "target", links: [{ rel: IS, to: 2 }] },
    { id: IS, name: "is", links: [{ rel: IS, to: 2 }] },
    { id: 10, name: "wheel", links: [{ rel: IS, to: 1 }] },
    { id: 11, name: "person", links: [{ rel: IS, to: 1 }] },
    { id: 20, name: "wash", links: [{ rel: IS, to: 3 }] },
  ],
};

const first = {
  name: "first",
  symbols: { letter: { characters: "z" } },
  words: { z: { pos: "word", meaning: "z" } },
  marking: "after",
  parts: { before: "target", after: "agent" },
  expressions: { learn: "wrong language" },
};

const reverse = {
  name: "reverse",
  symbols: { letter: { characters: "abcdefghijklmnopqrstuvwxyz" } },
  words: {
    person: { pos: "noun", meaning: "person", concept: 11 },
    wash: { pos: "verb", meaning: "wash", concept: 20 },
    wheel: { pos: "noun", meaning: "wheel", concept: 10 },
    origin: { pos: "particle", meaning: "origin", role: "source" },
  },
  // The referent comes before its marker: `wheel origin`.
  marking: "before",
  parts: { before: "agent", after: "target" },
  expressions: { learn: "reverse learned", unknown: "reverse unknown" },
  grammar: {
    start: "sentence",
    rules: { sentence: { rules: ["noun verb noun particle"] } },
  },
};

function find(root, kind) {
  if (root.kind === kind) return root;
  for (const child of root.branch || []) {
    const found = find(child, kind);
    if (found) return found;
  }
  return null;
}

test("word order comes from the language that recognized the signal", () => {
  const knowledge = fromSources({ world, languages: [first, reverse] });
  const result = brainFrom("person wash wheel origin", knowledge);
  assertEquals(result.expression.name, "learn");
  assertEquals(result.expression.state.says, "reverse learned");
  const event = find(result.roots[0], "event");
  assert(event !== null, "the action happened");
  assertEquals(event.state.parts, [
    { role: AGENT, of: 11, amount: null },
    { role: SOURCE, of: 10, amount: null },
  ]);
});
