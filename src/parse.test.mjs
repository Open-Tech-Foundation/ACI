import { test, assert, assertEquals } from "runtime:test";
import { brainFrom } from "./brain.js";
import { fromSources } from "./knowledge.js";

// A minimal language: two words, and whatever grammar a case needs.
function lang(grammar) {
  return fromSources({
    languages: [
      {
        name: "test",
        symbols: { letter: { characters: "abcdefghijklmnopqrstuvwxyz" } },
        words: {
          a: { pos: "one", meaning: "a" },
          b: { pos: "two", meaning: "b" },
        },
        grammar,
      },
    ],
  });
}

test("a left-recursive rule yields no parse instead of overflowing", () => {
  const l = lang({
    start: "s",
    rules: { s: { rules: ["s one", "one two"] } },
  });
  const r = brainFrom("a b", l);
  assertEquals(r.roots.length, 1, "the sound rule still parses");
  assertEquals(r.roots[0].kind, "s");
});

test("a wholly left-recursive grammar terminates with no parse", () => {
  const l = lang({ start: "s", rules: { s: { rules: ["s one"] } } });
  const r = brainFrom("a b", l);
  assertEquals(r.roots.length, 2, "unparseable input stays as word roots");
});

test("a longer alternative is taken when the short one cannot finish", () => {
  const l = lang({
    start: "s",
    rules: { s: { rules: ["one", "one s"] } },
  });
  const r = brainFrom("a a", l);
  assertEquals(r.roots.length, 1);
  assert(r.roots[0].branch.some((b) => b.kind === "s"), "recursed into the tail");
});

test("a grammar with no start symbol is refused, not tolerated", () => {
  let thrown = null;
  try {
    lang({ rules: { s: { rules: ["one two"] } } });
  } catch (e) {
    thrown = e;
  }
  assert(thrown !== null, "a grammar that names no start never reaches the brain");
  assert(String(thrown.message).includes("start"), thrown && thrown.message);
});

test("a start symbol with no rule is refused", () => {
  let thrown = null;
  try {
    lang({ start: "missing", rules: { s: { rules: ["one two"] } } });
  } catch (e) {
    thrown = e;
  }
  assert(thrown !== null);
  assert(String(thrown.message).includes("missing"), thrown && thrown.message);
});

test("a language with no grammar simply structures nothing", () => {
  const l = fromSources({
    languages: [
      {
        name: "test",
        symbols: { letter: { characters: "ab" } },
        words: { a: { pos: "one", meaning: "a" }, b: { pos: "two", meaning: "b" } },
      },
    ],
  });
  assertEquals(brainFrom("a b", l).roots.length, 2);
});

test("a parse must consume every token", () => {
  const l = lang({ start: "s", rules: { s: { rules: ["one"] } } });
  assertEquals(brainFrom("a b", l).roots.length, 2, "trailing token rejects the parse");
});
