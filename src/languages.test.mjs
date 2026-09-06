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
  assertEquals(l.lookupWord("AB")[0].meaning, "a thing", "every reading, and this word has one");
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

test("a word not listed may be one the language derives", () => {
  const l = fromData({
    ...data,
    words: { dog: { pos: "noun", meaning: "dog" }, fly: { pos: "noun", meaning: "fly" } },
    derivations: [
      { ending: "ies", becomes: "y", of: "noun" },
      { ending: "s", becomes: "", of: "noun" },
    ],
  });
  assertEquals(l.lookupWord("dogs")[0].meaning, "dog");
  assertEquals(l.lookupWord("flies")[0].meaning, "fly");
  assertEquals(l.lookupWord("dogs")[0].derived, { from: "dog", ending: "s" });
  assertEquals(l.lookupWord("dog")[0].derived, undefined, "a listed word is not derived");
});

test("a listed word always wins over a derived one", () => {
  const l = fromData({
    ...data,
    words: {
      a: { pos: "article", meaning: "one" },
      as: { pos: "noun", meaning: "an as" },
    },
    derivations: [{ ending: "s", becomes: "", of: "noun" }],
  });
  assertEquals(l.lookupWord("as")[0].meaning, "an as");
});

test("a rule reaches only the part of speech it names", () => {
  const l = fromData({
    ...data,
    words: { a: { pos: "article", meaning: "one" } },
    derivations: [{ ending: "s", becomes: "", of: "noun" }],
  });
  assertEquals(l.lookupWord("as"), null, "the article is not a noun, so `as` is nothing");
});

test("a language with no derivations derives nothing", () => {
  const l = fromData({ ...data, words: { dog: { pos: "noun", meaning: "dog" } } });
  assertEquals(l.lookupWord("dogs"), null);
});

test("nothing is derived from a word shorter than the ending", () => {
  const l = fromData({
    ...data,
    words: { s: { pos: "noun", meaning: "s" } },
    derivations: [{ ending: "s", becomes: "", of: "noun" }],
  });
  assertEquals(l.lookupWord("s")[0].meaning, "s");
});

test("number words compose by the language's ordered arithmetic rules", () => {
  const l = fromData({
    ...data,
    numbers: {
      composition: [
        {
          order: "descending",
          multipleOf: { side: "left", value: 5 },
          operation: "add",
        },
        {
          order: "ascending",
          multipleOf: { side: "right", value: 5 },
          operation: "multiply",
        },
      ],
    },
  });
  assertEquals(l.joinNumbers(15, 4), 19, "the declared base, not a built-in ten");
  assertEquals(l.joinNumbers(3, 25), 75);
  assertEquals(l.joinNumbers(14, 3), null, "no matching rule means two numbers remain two");
});

test("the first matching number rule is deterministic", () => {
  const l = fromData({
    ...data,
    numbers: {
      composition: [
        { order: "equal", operation: "multiply" },
        { order: "any", operation: "add" },
        { order: "any", operation: "multiply" },
      ],
    },
  });
  assertEquals(l.joinNumbers(2, 3), 5);
  assertEquals(l.joinNumbers(3, 3), 9);
});

test("number composition never returns an inexact integer", () => {
  const l = fromData({
    ...data,
    numbers: { composition: [{ order: "any", operation: "multiply" }] },
  });
  assertEquals(l.joinNumbers(Number.MAX_SAFE_INTEGER, 2), null);
  assertEquals(l.joinNumbers(2.5, 10), null);
});

test("the raw language adapter never interprets an invalid number rule", () => {
  const l = fromData({
    ...data,
    numbers: { composition: [{ order: "sideways", operation: "subtract" }] },
  });
  assertEquals(l.joinNumbers(2, 2), null);
});
