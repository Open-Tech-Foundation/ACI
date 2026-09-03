import { test, assert, assertEquals } from "runtime:test";
import { brainFrom } from "./brain.js";
import { fromData } from "./languages.js";

// A minimal language: two words, and whatever grammar a case needs.
function lang(grammar) {
  return fromData({
    name: "test",
    symbols: { letter: { characters: "abcdefghijklmnopqrstuvwxyz" } },
    words: {
      a: { pos: "one" },
      b: { pos: "two" },
    },
    grammar,
  });
}

test("a left-recursive rule yields no parse instead of overflowing", () => {
  const l = lang({
    start: "s",
    rules: { s: { rules: ["s one", "one two"] } },
  });
  const r = brainFrom("a b", [l]);
  assertEquals(r.roots.length, 1, "the sound rule still parses");
  assertEquals(r.roots[0].kind, "s");
});

test("a wholly left-recursive grammar terminates with no parse", () => {
  const l = lang({ start: "s", rules: { s: { rules: ["s one"] } } });
  const r = brainFrom("a b", [l]);
  assertEquals(r.roots.length, 2, "unparseable input stays as word roots");
});

test("a longer alternative is taken when the short one cannot finish", () => {
  const l = lang({
    start: "s",
    rules: { s: { rules: ["one", "one s"] } },
  });
  const r = brainFrom("a a", [l]);
  assertEquals(r.roots.length, 1);
  assert(r.roots[0].branch.some((b) => b.kind === "s"), "recursed into the tail");
});

test("a grammar with no start symbol structures nothing", () => {
  const l = lang({ rules: { s: { rules: ["one two"] } } });
  assertEquals(brainFrom("a b", [l]).roots.length, 2);
});

test("a start symbol with no rule structures nothing", () => {
  const l = lang({ start: "missing", rules: { s: { rules: ["one two"] } } });
  assertEquals(brainFrom("a b", [l]).roots.length, 2);
});

test("a parse must consume every token", () => {
  const l = lang({ start: "s", rules: { s: { rules: ["one"] } } });
  assertEquals(brainFrom("a b", [l]).roots.length, 2, "trailing token rejects the parse");
});
