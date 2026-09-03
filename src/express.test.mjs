import { test, assert, assertEquals } from "runtime:test";
import { brainFrom } from "./brain.js";
import { fromSources } from "./knowledge.js";

const IS = 9;
const world = {
  anchors: { thing: 1, relation: 4, communication: 5, number: 2 },
  relations: { is: IS },
  terms: [
    { id: 1, name: "thing", links: [] },
    { id: 2, name: "number", links: [{ rel: IS, to: 1 }] },
    { id: 3, name: "two", links: [{ rel: IS, to: 2 }] },
    { id: 4, name: "relation", links: [] },
    { id: 5, name: "communication", links: [] },
    { id: 6, name: "hail", links: [{ rel: IS, to: 5 }] },
    { id: IS, name: "is", links: [{ rel: IS, to: 4 }] },
  ],
};

function lang(name, expressions) {
  return {
    name,
    symbols: { letter: { characters: "abcdefghijklmnopqrstuvwxyz" } },
    words: {
      two: { pos: "numeral", meaning: "2", concept: 3 },
      oi: { pos: "noun", meaning: "a hail", concept: 6 },
    },
    expressions,
  };
}

const withWorld = (l) => fromSources({ world, languages: [l] });
const withoutWorld = (l) => fromSources({ languages: [l] });
const mute = lang("mute");
const spoken = lang("spoken", { count: "dos: {meaning}", greet: "buenas" });

const saidOf = (r) => (r.roots[0].branch || []).find((b) => b.kind === "express");

test("the intent comes from the world, not the part of speech", () => {
  // "oi" is filed as a noun, but its term is a communication — the brain greets.
  const r = brainFrom("oi", withWorld(spoken));
  assertEquals(saidOf(r).name, "greet");
  assertEquals(saidOf(r).state.says, "buenas");
});

test("without a world the brain cannot tell what it is looking at", () => {
  const r = brainFrom("oi", withoutWorld(spoken));
  assertEquals(saidOf(r).name, "recognise", "no world, no category to answer");
});

test("the brain understands the same whatever the language can say", () => {
  const a = brainFrom("two", withWorld(mute));
  const b = brainFrom("two", withWorld(spoken));
  assertEquals(saidOf(a).name, saidOf(b).name, "the act is the same either way");
  assertEquals(saidOf(a).name, "count");
  assertEquals(saidOf(a).says ?? saidOf(a).state.says, null);
  assertEquals(saidOf(b).state.says, "dos: 2");
});

test("the intent is the brain's, the words are the language's", () => {
  const r = brainFrom("two", withWorld(spoken));
  assertEquals(saidOf(r).state.language, "spoken");
  assertEquals(r.expression.name, "count", "the brain names the act");
  assertEquals(r.expression.state.says, "dos: 2", "the language supplies the words");
});

test("the engine has no reply to fall back on", () => {
  const r = brainFrom("two", withWorld(mute));
  assertEquals(r.expression.state.says, null);
  assert(!JSON.stringify(r).includes("It is 2."), "no other language's words leak in");
});

// The brain reports its own state by handing over the terms it means. Nothing
// it says is written down anywhere in the engine — not even "I don't know".
const stateWorld = {
  anchors: { thing: 1, relation: 4, self: 7, know: 8 },
  relations: { is: 9 },
  terms: [
    { id: 1, name: "thing", links: [] },
    { id: 4, name: "relation", links: [] },
    { id: 7, name: "self", links: [{ rel: 9, to: 1 }] },
    { id: 8, name: "know", links: [{ rel: 9, to: 1 }] },
    { id: 9, name: "is", links: [{ rel: 9, to: 4 }] },
    { id: 10, name: "one", links: [{ rel: 9, to: 1 }] },
    { id: 11, name: "other", links: [{ rel: 9, to: 1 }] },
  ],
};

function stateLang(knowWord, speech, frames) {
  return {
    name: "test",
    symbols: {
      letter: { characters: "abcdefghijklmnopqrstuvwxyz" },
      question: { characters: "?" },
    },
    words: {
      one: { pos: "noun", meaning: "one", concept: 10 },
      other: { pos: "noun", meaning: "other", concept: 11 },
      is: { pos: "verb", meaning: "is", concept: 9 },
      [knowWord]: { pos: "verb", meaning: "know", concept: 8 },
    },
    speech,
    expressions: frames,
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
}

const unsureIn = (lang) =>
  brainFrom("one is other?", fromSources({ world: stateWorld, languages: [lang] }))
    .expression.state.says;

test("what the brain says about its own state is built from the term it means", () => {
  const said = unsureIn(
    stateLang("know", { self: "I" }, { unsure: "{self} don't {relation}." }),
  );
  assertEquals(said, "I don't know.");
});

test("change the word for that term and the reply follows", () => {
  const said = unsureIn(
    stateLang("ken", { self: "I" }, { unsure: "{self} don't {relation}." }),
  );
  assertEquals(said, "I don't ken.", "nothing was written down, so it changed");
});

test("another language says it its own way, from the same brain state", () => {
  const said = unsureIn(
    stateLang("saber", { self: "yo" }, { unsure: "{self} no {relation}." }),
  );
  assertEquals(said, "yo no saber.");
});

test("a language with no word for the term leaves the slot empty, not filled in", () => {
  const lang = stateLang("know", { self: "I" }, { unsure: "{self} don't {relation}." });
  delete lang.words.know;
  assertEquals(unsureIn(lang), "I don't .");
});
