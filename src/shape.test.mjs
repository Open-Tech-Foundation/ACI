import { test, assert, assertEquals } from "runtime:test";
import { fromSources } from "./knowledge.js";
import { brainFrom } from "./brain.js";

const IS = 9;
const world = {
  anchors: { thing: 1 },
  relations: { is: IS },
  terms: [
    { id: 1, name: "thing", links: [] },
    { id: 2, name: "relation", links: [] },
    { id: IS, name: "is", links: [{ rel: IS, to: 2 }] },
    { id: 10, name: "bird", links: [{ rel: IS, to: 1 }] },
  ],
};

const refuses = (what, sources) => {
  let thrown = null;
  try {
    fromSources(sources);
  } catch (e) {
    thrown = e;
  }
  assert(thrown !== null, `${what} was accepted`);
  return String(thrown.message);
};

test("a well-shaped world is accepted", () => {
  const k = fromSources({ world });
  assert(k.world.isA(10, 1), "bird is a thing");
});

test("a link to a term that does not exist is refused", () => {
  const bad = { ...world, terms: [...world.terms, { id: 11, name: "x", links: [{ rel: IS, to: 999 }] }] };
  assert(refuses("dangling link", { world: bad }).includes("999"));
});

test("a link by a relation that does not exist is refused", () => {
  const bad = { ...world, terms: [...world.terms, { id: 11, name: "x", links: [{ rel: 777, to: 1 }] }] };
  assert(refuses("unknown relation", { world: bad }).includes("777"));
});

test("a duplicate id is refused", () => {
  const bad = { ...world, terms: [...world.terms, { id: 10, name: "other", links: [] }] };
  assert(refuses("duplicate id", { world: bad }).includes("duplicate"));
});

test("an anchor pointing nowhere is refused", () => {
  const bad = { ...world, anchors: { thing: 404 } };
  assert(refuses("dangling anchor", { world: bad }).includes("404"));
});

test("an unknown field is refused rather than ignored", () => {
  assert(refuses("stray field", { world: { ...world, extra: true } }).includes("extra"));
});

test("terms with no relation to walk are refused", () => {
  const bad = { terms: [{ id: 1, name: "thing", links: [] }] };
  assert(refuses("no relations", { world: bad }).includes("relations"));
});

test("a word with no meaning is refused", () => {
  const msg = refuses("meaningless word", {
    languages: [{ name: "l", symbols: { letter: { characters: "ab" } }, words: { a: { pos: "one" } } }],
  });
  assert(msg.includes("meaning"), msg);
});

test("a word that points may not also name a term", () => {
  const msg = refuses("a pointer naming a term", {
    languages: [
      {
        name: "l",
        symbols: { letter: { characters: "ab" } },
        words: { a: { pos: "one", meaning: "me", marks: "from", concept: 10 } },
      },
    ],
  });
  assert(msg.includes("names no term of its own"), msg);
});

test("a language with no letters is refused", () => {
  const msg = refuses("letterless language", {
    languages: [{ name: "l", symbols: {}, words: {} }],
  });
  assert(msg.includes("letter"), msg);
});

test("external knowledge passes the same door as the world", () => {
  const msg = refuses("dangling link from a knowledge file", {
    world,
    knowledge: [{ terms: [{ id: 12, name: "wing", links: [{ rel: IS, to: 888 }] }] }],
  });
  assert(msg.includes("knowledge[0]"), msg);
  assert(msg.includes("888"), msg);
});

test("knowledge may add links to a term the world already has", () => {
  const k = fromSources({
    world,
    knowledge: [
      {
        terms: [
          { id: 20, name: "animal", links: [{ rel: IS, to: 1 }] },
          { id: 10, name: "bird", links: [{ rel: IS, to: 20 }] },
        ],
      },
    ],
  });
  assert(k.world.isA(10, 20), "the taught link is walked");
  assert(k.world.isA(10, 1), "and the world's own link still is");
});

test("knowledge may not redefine a term the world already has", () => {
  const msg = refuses("contradicting term", {
    world,
    knowledge: [{ terms: [{ id: 10, name: "stone", links: [] }] }],
  });
  assert(msg.includes("bird") && msg.includes("stone"), msg);
});

test("knowledge may not move an anchor", () => {
  const msg = refuses("moved anchor", {
    world,
    knowledge: [{ anchors: { thing: 10 }, terms: [] }],
  });
  assert(msg.includes("anchor"), msg);
});

test("one thing may not be written twice in a source", () => {
  const bad = { ...world, terms: [...world.terms, { id: 11, name: "bird", links: [] }] };
  const msg = refuses("a second bird", { world: bad });
  assert(msg.includes("bird") && msg.includes("one thing, one term"), msg);
});

test("nor twice between two sources", () => {
  const msg = refuses("a bird taught beside the one known", {
    world,
    knowledge: [{ terms: [{ id: 12, name: "bird", links: [{ rel: IS, to: 1 }] }] }],
  });
  assert(msg.includes("one thing, one term"), msg);
});

test("children of a disjoint parent are kinds apart", () => {
  const k = fromSources({
    world: {
      anchors: { thing: 1 },
      relations: { is: IS },
      terms: [
        { id: 1, name: "thing", links: [], disjoint: true },
        { id: 2, name: "relation", links: [] },
        { id: IS, name: "is", links: [{ rel: IS, to: 2 }] },
        { id: 20, name: "here", links: [{ rel: IS, to: 1 }] },
        { id: 21, name: "there", links: [{ rel: IS, to: 1 }] },
        { id: 22, name: "deep", links: [{ rel: IS, to: 20 }] },
        { id: 23, name: "far", links: [{ rel: IS, to: 21 }] },
      ],
    },
  });
  assert(k.world.excludes(22, 23), "one marking did the work of every pair");
  assertEquals(k.world.excludes(22, 20), false, "a thing is not apart from its own kind");
});

// ---------------------------------------------------------------------------
// Files that name the same language are one language: a service ships the
// words for its own tools, and an instance is given its own name, without
// owning the file that holds the alphabet.
// ---------------------------------------------------------------------------
const english = {
  name: "test",
  symbols: { letter: { characters: "abcdefghijklmnopqrstuvwxyz" }, question: { characters: "?" } },
  words: {
    what: { pos: "interrogative", meaning: "what", marks: "unknown" },
    is: { pos: "verb", meaning: "is", concept: IS },
    your: { pos: "pronoun", meaning: "to", marks: "to" },
    name: { pos: "noun", meaning: "name", concept: 92 },
  },
  expressions: { answer: "{meaning}", unknown: "..." },
  grammar: {
    start: "sentence",
    rules: {
      sentence: { rules: ["interrogative verb subject"] },
      subject: { rules: ["pronoun noun"] },
    },
  },
};

const named = {
  anchors: { thing: 1, relation: 2, name: 92, self: 99 },
  relations: { is: IS, name: 92 },
  terms: [
    { id: 1, name: "thing", links: [] },
    { id: 2, name: "relation", links: [] },
    { id: IS, name: "is", links: [{ rel: IS, to: 2 }] },
    { id: 92, name: "name", links: [{ rel: IS, to: 2 }] },
    { id: 99, name: "self", links: [{ rel: IS, to: 1 }] },
  ],
};

test("two files naming one language are one language", () => {
  const k = fromSources({
    world: named,
    languages: [english, { name: "test", words: { zed: { pos: "noun", meaning: "zed", concept: 99 } } }],
  });
  assertEquals(k.languages.length, 1, "one language, not two that shout over each other");
  assertEquals(k.languages[0].lookupWord("zed")[0].concept, 99);
  assertEquals(k.languages[0].lookupWord("what")[0].meaning, "what");
});

test("an instance is given its name in memory, not in a language", () => {
  // This world has no term for nothing, so it has nothing to answer with.
  const bare = fromSources({ world: named, languages: [english] });
  assertEquals(brainFrom("what is your name?", bare).expression.name, "unsure");

  // The runtime loads what this one instance is into memory, in the shape
  // everything else takes. No language is touched: a name is not translated.
  const told = fromSources({
    world: named,
    knowledge: [
      {
        terms: [
          { id: 100, name: "the name", symbol: "zed", links: [{ rel: IS, to: 1 }] },
          { id: 99, name: "self", links: [{ rel: 92, to: 100 }] },
        ],
      },
    ],
    languages: [english],
  });
  assertEquals(brainFrom("what is your name?", told).expression.state.says, "zed");
});

test("a fragment carries no alphabet of its own", () => {
  const k = fromSources({
    world: named,
    languages: [{ name: "test", words: { zed: { pos: "noun", meaning: "zed" } } }, english],
  });
  assert(k.languages[0].isLetterSymbol("q"), "the alphabet came from the other file");
});

test("a language nobody gave letters to is refused", () => {
  const msg = refuses("a language with no file declaring letters", {
    world: named,
    languages: [{ name: "test", words: { zed: { pos: "noun", meaning: "zed" } } }],
  });
  assert(msg.includes("letter"), msg);
});

test("a word said twice differently is refused", () => {
  const msg = refuses("two files disagreeing about a word", {
    world: named,
    languages: [english, { name: "test", words: { name: { pos: "noun", meaning: "label", concept: 92 } } }],
  });
  assert(msg.includes('words "name"'), msg);
});

test("a frame said twice differently is refused", () => {
  const msg = refuses("two files disagreeing about an intent", {
    world: named,
    languages: [english, { name: "test", expressions: { answer: "it is {meaning}" } }],
  });
  assert(msg.includes('expressions "answer"'), msg);
});

test("another way to say a sentence is added, not swapped in", () => {
  const k = fromSources({
    world: named,
    languages: [english, { name: "test", grammar: { rules: { subject: { rules: ["noun"] } } } }],
  });
  assertEquals(k.languages[0].grammar.rules.subject.rules, ["pronoun noun", "noun"]);
});

test("files naming different languages stay apart", () => {
  const k = fromSources({
    world: named,
    languages: [english, { ...english, name: "other" }],
  });
  assertEquals(k.languages.length, 2);
});

test("one proposition cannot be both held and denied", () => {
  const msg = refuses("opposing links", {
    world: {
      relations: { is: 1 },
      terms: [
        { id: 1, name: "is", links: [] },
        { id: 2, name: "a", links: [{ rel: 1, to: 3 }, { rel: 1, to: 3, not: true }] },
        { id: 3, name: "b", links: [] },
      ],
    },
  });
  assert(msg.includes("both held and denied"), msg);
});

test("world numeric fields reject values outside the exact JSON integer range", () => {
  const bad = {
    ...world,
    terms: world.terms.map((term) => term.id === 1
      ? { ...term, value: Number.MAX_SAFE_INTEGER + 1 }
      : term),
  };
  const msg = refuses("an unsafe numeric value", { world: bad });
  assert(msg.includes("safe whole number"), msg);
});

test("classification cycles are refused at the knowledge door", () => {
  const msg = refuses("classification cycle", {
    world: {
      relations: { is: 1 },
      terms: [
        { id: 1, name: "is", links: [] },
        { id: 2, name: "a", links: [{ rel: 1, to: 3 }] },
        { id: 3, name: "b", links: [{ rel: 1, to: 2 }] },
      ],
    },
  });
  assert(msg.includes("classification cycle"), msg);
});
