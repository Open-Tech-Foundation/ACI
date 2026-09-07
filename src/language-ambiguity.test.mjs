import { test, assert, assertEquals } from "runtime:test";
import { file } from "runtime:fs";
import { brainFrom } from "./brain.js";
import { fromSources } from "./knowledge.js";

const joined = {
  name: "joined",
  symbols: { letter: { characters: "ab+" } },
  words: { "a+b": { pos: "word", meaning: "whole" } },
  expressions: { recognise: "joined: {meaning}" },
};

const split = {
  name: "split",
  symbols: {
    letter: { characters: "ab" },
    sign: { characters: "+", alone: true },
  },
  words: {
    a: { pos: "word", meaning: "left" },
    "+": { pos: "word", meaning: "join" },
    b: { pos: "word", meaning: "right" },
  },
  expressions: { recognise: "split: {meaning}" },
};

function branch(root, kind) {
  return (root.branch || []).find((part) => part.kind === kind) || null;
}

test("complete competing language readings remain explicit and order-independent", () => {
  const forward = brainFrom("a+b", fromSources({ languages: [joined, split] }));
  const reverse = brainFrom("a+b", fromSources({ languages: [split, joined] }));

  for (const result of [forward, reverse]) {
    assertEquals(result.roots.length, 1, "neither candidate tokenization was silently selected");
    assertEquals(result.roots[0].state.identity, "a+b");
    assertEquals(result.expression.name, "unknown");
    assertEquals(result.expression.state.says, null);
    assertEquals(result.learned, null);

    const language = branch(result.phases.understand[0], "language");
    assertEquals(language.name, "ambiguous");
    assertEquals(language.state.matches, []);
    assertEquals(language.state.candidates, [
      { lang: "joined", tokens: ["a+b"] },
      { lang: "split", tokens: ["a", "+", "b"] },
    ]);
    assertEquals(branch(result.phases.think[0], "thought"), null);
  }
});

test("ambiguous language conventions cannot ask or teach", async () => {
  const english = await file(new URL('../languages/en.json', import.meta.url).pathname).json();
  const world = await file(new URL('../data/world.json', import.meta.url).pathname).json();
  const bang = structuredClone(english);
  bang.name = "bang";
  bang.symbols.question.characters = "!";
  const result = brainFrom(
    "a stone is warm?",
    fromSources({ world, languages: [english, bang] }),
  );

  assertEquals(result.expression.state.mood, "tell");
  assertEquals(result.expression.name, "unknown");
  assertEquals(result.expression.state.says, null);
  assertEquals(result.learned, null, "no candidate interpretation changed the world");
  assert(
    result.phases.understand.every((root) => branch(root, "language").name === "ambiguous"),
    "the ambiguity remains inspectable on every perceived token",
  );
});
