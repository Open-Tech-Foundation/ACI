import { assert, assertEquals, test } from "runtime:test";
import { normalize, tokenize } from "./normalize.js";

test("normalize folds case, punctuation and accents to one form", () => {
  assertEquals(normalize("Hi!"), "hi");
  assertEquals(normalize("  HELLO,   world??  "), "hello world");
  assertEquals(normalize("café"), "cafe");
  assertEquals(normalize("Thank—you"), "thank you");
});

test("normalize keeps the apostrophe that carries meaning", () => {
  assertEquals(normalize("don't"), "don't");
});

test("normalize of punctuation alone is empty, not a stray space", () => {
  assertEquals(normalize("!!!"), "");
  assertEquals(normalize("   "), "");
});

test("tokenize keeps the surface next to the normalized form", () => {
  const tokens = tokenize("Hi There!");
  assertEquals(tokens.length, 2);
  assertEquals(tokens[0].surface, "Hi");
  assertEquals(tokens[0].normalized, "hi");
  assertEquals(tokens[1].normalized, "there");
});

test("tokenize drops tokens that normalize away", () => {
  const tokens = tokenize("hi ... there");
  assertEquals(tokens.map((t) => t.normalized).join(" "), "hi there");
});

test("tokenize of empty input yields nothing", () => {
  assert(tokenize("").length === 0);
  assert(tokenize("   ").length === 0);
});
