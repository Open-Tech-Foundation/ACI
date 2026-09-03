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

test("a language voices an intent from its own data", () => {
  const l = fromData({
    ...data,
    expressions: { greet: "Hello!", count: "It is {meaning}." },
  });
  assertEquals(l.express("greet"), "Hello!");
  assertEquals(l.express("count", { meaning: "2" }), "It is 2.");
});

test("an intent the language has no words for is left unsaid", () => {
  const l = fromData({ ...data, expressions: { greet: "Hello!" } });
  assertEquals(l.express("deny"), null);
});

test("a language with no expressions says nothing at all", () => {
  assertEquals(fromData(data).express("greet"), null);
});

test("a slot with nothing to fill it is dropped", () => {
  const l = fromData({ ...data, expressions: { count: "It is {meaning}." } });
  assertEquals(l.express("count"), "It is .");
});

test("a term can be named back in this language's own word", () => {
  const l = fromData({
    ...data,
    words: { ab: { pos: "noun", meaning: "a thing", concept: 7 } },
  });
  assertEquals(l.wordFor(7), "ab");
  assertEquals(l.wordFor(8), null, "a term this language has no word for");
  assertEquals(l.wordFor(null), null);
});

test("the first word named for a term wins, in file order", () => {
  const l = fromData({
    ...data,
    words: {
      first: { pos: "noun", meaning: "x", concept: 7 },
      second: { pos: "noun", meaning: "x", concept: 7 },
    },
  });
  assertEquals(l.wordFor(7), "first");
});
