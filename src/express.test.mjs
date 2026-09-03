import { test, assert, assertEquals } from "runtime:test";
import { brainFrom } from "./brain.js";
import { fromData } from "./languages.js";

// A language that knows a word but has no words of its own for the brain's acts.
const mute = fromData({
  name: "mute",
  symbols: { letter: { characters: "abcdefghijklmnopqrstuvwxyz" } },
  words: { two: { pos: "numeral", meaning: "2" } },
});

const spoken = fromData({
  name: "spoken",
  symbols: { letter: { characters: "abcdefghijklmnopqrstuvwxyz" } },
  words: { two: { pos: "numeral", meaning: "2" } },
  expressions: { count: "dos: {meaning}" },
});

function said(r) {
  const e = (r.roots[0].branch || []).find((b) => b.kind === "express");
  return e ? e.state : null;
}

test("the brain understands the same whatever the language can say", () => {
  const a = brainFrom("two", [mute]);
  const b = brainFrom("two", [spoken]);
  assertEquals(said(a).says, null, "a language with no words for the act says nothing");
  assertEquals(said(b).says, "dos: 2");
  assertEquals(
    (a.roots[0].branch || []).find((x) => x.kind === "express").name,
    (b.roots[0].branch || []).find((x) => x.kind === "express").name,
    "the act the brain chose is the same either way",
  );
});

test("the intent is the brain's, the words are the language's", () => {
  const r = brainFrom("two", [spoken]);
  assertEquals(said(r).language, "spoken");
  assertEquals(r.expression.name, "count", "the brain names the act");
  assertEquals(r.expression.state.says, "dos: 2", "the language supplies the words");
});

test("the engine has no reply to fall back on", () => {
  const r = brainFrom("two", [mute]);
  assertEquals(r.expression.state.says, null);
  assert(
    !JSON.stringify(r).includes("It is 2."),
    "no reply from another language leaks in",
  );
});
