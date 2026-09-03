import { test, assert, assertEquals } from "runtime:test";
import { fromData } from "./languages.js";

const data = {
  name: "test",
  symbols: {
    letter: { characters: "abc" },
    vowel: { characters: "a" },
    punctuation: { characters: ". ?" },
  },
  words: { ab: { pos: "noun", meaning: "a thing" } },
};

test("a symbol set matches either case", () => {
  const l = fromData(data);
  assert(l.isLetterSymbol("a"));
  assert(l.isLetterSymbol("A"));
  assertEquals(l.isLetterSymbol("z"), false);
});

test("vowels are their own symbol set", () => {
  const l = fromData(data);
  assert(l.isVowelSymbol("a"));
  assertEquals(l.isVowelSymbol("b"), false);
});

test("a language with no vowel set hears none", () => {
  const l = fromData({ symbols: { letter: { characters: "abc" } } });
  assertEquals(l.isVowelSymbol("a"), false);
});

test("word lookup ignores case", () => {
  const l = fromData(data);
  assertEquals(l.lookupWord("AB").meaning, "a thing");
  assertEquals(l.lookupWord("zz"), null);
});

test("roles are the data's symbol types, never its words", () => {
  const l = fromData(data);
  assertEquals([...l.roles.keys()], ["letter", "vowel", "punctuation"]);
  assert(l.roles.get("punctuation").has("?"));
});

test("spaces in a symbol list are separators, not symbols", () => {
  const l = fromData(data);
  assertEquals(l.isLetterSymbol(" "), false);
  assertEquals(l.roles.get("punctuation").has(" "), false);
});
