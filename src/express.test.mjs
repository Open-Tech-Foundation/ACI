import { test, assert, assertEquals } from "runtime:test";
import { brainFrom } from "./brain.js";
import { fromData } from "./languages.js";
import { fromWorldData } from "./world.js";

const IS = 9;
const world = fromWorldData({
  anchors: { thing: 1, relation: 4, communication: 5, number: 2 },
  relations: { is: IS },
  terms: [
    { id: 1, name: "thing", links: [] },
    { id: 2, name: "number", links: [{ rel: IS, to: 1 }] },
    { id: 3, name: "two", links: [{ rel: IS, to: 2 }] },
    { id: 4, name: "relation", links: [] },
    { id: 5, name: "communication", links: [] },
    { id: 6, name: "hail", links: [{ rel: IS, to: 5 }] },
  ],
});

function lang(name, expressions) {
  return fromData({
    name,
    symbols: { letter: { characters: "abcdefghijklmnopqrstuvwxyz" } },
    words: {
      two: { pos: "numeral", meaning: "2", concept: 3 },
      oi: { pos: "noun", meaning: "a hail", concept: 6 },
    },
    expressions,
  });
}

const mute = lang("mute");
const spoken = lang("spoken", { count: "dos: {meaning}", greet: "buenas" });

const saidOf = (r) => (r.roots[0].branch || []).find((b) => b.kind === "express");

test("the intent comes from the world, not the part of speech", () => {
  // "oi" is filed as a noun, but its term is a communication — the brain greets.
  const r = brainFrom("oi", [spoken], world);
  assertEquals(saidOf(r).name, "greet");
  assertEquals(saidOf(r).state.says, "buenas");
});

test("without a world the brain cannot tell what it is looking at", () => {
  const r = brainFrom("oi", [spoken]);
  assertEquals(saidOf(r).name, "recognise", "no world, no category to answer");
});

test("the brain understands the same whatever the language can say", () => {
  const a = brainFrom("two", [mute], world);
  const b = brainFrom("two", [spoken], world);
  assertEquals(saidOf(a).name, saidOf(b).name, "the act is the same either way");
  assertEquals(saidOf(a).name, "count");
  assertEquals(saidOf(a).says ?? saidOf(a).state.says, null);
  assertEquals(saidOf(b).state.says, "dos: 2");
});

test("the intent is the brain's, the words are the language's", () => {
  const r = brainFrom("two", [spoken], world);
  assertEquals(saidOf(r).state.language, "spoken");
  assertEquals(r.expression.name, "count", "the brain names the act");
  assertEquals(r.expression.state.says, "dos: 2", "the language supplies the words");
});

test("the engine has no reply to fall back on", () => {
  const r = brainFrom("two", [mute], world);
  assertEquals(r.expression.state.says, null);
  assert(!JSON.stringify(r).includes("It is 2."), "no other language's words leak in");
});
