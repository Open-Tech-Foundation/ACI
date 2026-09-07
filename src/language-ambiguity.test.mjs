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

function grammatical(name, rule) {
  return {
    name,
    symbols: { letter: { characters: "ab" } },
    words: {
      a: { pos: "one", meaning: "left" },
      b: { pos: "two", meaning: "right" },
    },
    grammar: { start: "sentence", rules: { sentence: { rules: [rule] } } },
  };
}

function lexical(name, knowsEntity) {
  return {
    name,
    symbols: { letter: { characters: "abcdefghijklmnopqrstuvwxyz" } },
    unknown: { pos: "entity" },
    words: {
      ...(knowsEntity ? { mira: { pos: "entity", meaning: "mira" } } : {}),
      ...(!knowsEntity ? { rim: { pos: "entity", meaning: "rim" } } : {}),
      acts: { pos: "action", meaning: "acts" },
    },
    grammar: {
      start: "sentence",
      rules: { sentence: { rules: ["entity action"] } },
    },
  };
}

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

test("one whole grammar parse resolves competing complete readings", () => {
  const fits = grammatical("fits", "one two");
  const misses = grammatical("misses", "two one");

  for (const languages of [[fits, misses], [misses, fits]]) {
    const result = brainFrom("a b", fromSources({ languages }));
    assertEquals(result.roots.length, 1);
    assertEquals(result.roots[0].kind, "sentence");
    for (const root of result.phases.understand) {
      const language = branch(root, "language");
      assertEquals(language.name, "fits");
      assertEquals(language.state.resolution, {
        by: "grammar",
        candidates: [
          { lang: "fits", tokens: ["a", "b"] },
          { lang: "misses", tokens: ["a", "b"] },
        ],
      });
    }
  }
});

test("equally grammatical readings remain ambiguous", () => {
  const alpha = grammatical("alpha", "one two");
  const beta = grammatical("beta", "one two");
  const result = brainFrom("a b", fromSources({ languages: [beta, alpha] }));

  assertEquals(result.roots.length, 2);
  assertEquals(result.expression.name, "unknown");
  assertEquals(result.learned, null);
  assert(
    result.phases.understand.every((root) => branch(root, "language").name === "ambiguous"),
  );
});

test("complete lexical meaning resolves an equal grammar tie", () => {
  const known = lexical("known", true);
  const unnamed = lexical("unnamed", false);

  for (const languages of [[known, unnamed], [unnamed, known]]) {
    const result = brainFrom("mira acts", fromSources({ languages }));
    assertEquals(result.roots.length, 1);
    assertEquals(result.roots[0].kind, "sentence");
    for (const root of result.phases.understand) {
      const language = branch(root, "language");
      assertEquals(language.name, "known");
      assertEquals(language.state.resolution.by, "meaning");
    }
  }
});

test("existing world concepts resolve an equal meaning tie", async () => {
  const english = await file(new URL('../languages/en.json', import.meta.url).pathname).json();
  const world = await file(new URL('../data/world.json', import.meta.url).pathname).json();
  const grounded = structuredClone(english);
  grounded.name = "grounded";
  const absent = structuredClone(english);
  absent.name = "absent";
  absent.words.stone.concept = 999999;

  for (const languages of [[grounded, absent], [absent, grounded]]) {
    const result = brainFrom(
      "a stone is warm?",
      fromSources({ world, languages }),
    );
    assertEquals(result.learned, null);
    assertEquals(result.expression.state.mood, "ask");
    for (const root of result.phases.understand) {
      const language = branch(root, "language");
      assertEquals(language.name, "grounded");
      assertEquals(language.state.resolution.by, "world");
    }
  }
});
