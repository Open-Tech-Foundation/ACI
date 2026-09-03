import { test, assert, assertEquals } from "runtime:test";
import { brain } from "./index.js";

function kind(root, k) {
  return (root.branch || []).find((b) => b.kind === k) || null;
}

test("empty input yields a void root with no language", async () => {
  const r = await brain("");
  assertEquals(r.roots.length, 1);
  assertEquals(r.roots[0].kind, "void");
  assertEquals(kind(r.roots[0], "language"), null);
});

test("a letter is perceived as a thing", async () => {
  const r = await brain("a");
  const root = r.roots[0];
  assertEquals(root.kind, "thing");
  assertEquals(root.name, "a");
  assert(kind(root, "quality") !== null);
});

test("perception branches into visual and sound", async () => {
  const r = await brain("a");
  const qualities = (r.roots[0].branch || []).filter((b) => b.kind === "quality");
  const names = qualities.map((q) => q.name);
  assert(names.includes("visual"));
  assert(names.includes("sound"));
});

test("recognizes 'hi' as english and knows its meaning from data", async () => {
  const r = await brain("hi");
  const root = r.roots[0];
  const lang = kind(root, "language");
  assert(lang !== null);
  assertEquals(lang.state.matches[0].lang, "english");
  assertEquals(lang.state.matches[0].word.meaning, "greeting");
});

test("recognizes a known numeral word", async () => {
  const r = await brain("two");
  const thought = kind(r.roots[0], "thought");
  assertEquals(thought.state.thought.meaning, "2");
});

test("an unknown word matches the alphabet but has no meaning", async () => {
  const r = await brain("xyz");
  const lang = kind(r.roots[0], "language");
  assertEquals(lang.state.matches[0].lang, "english");
  assertEquals(lang.state.matches[0].word, null);
});

test("punctuation is not recognized as any language", async () => {
  const r = await brain("?");
  assertEquals(kind(r.roots[0], "language"), null);
});

test("responds with the meaning for a known word", async () => {
  const r = await brain("hello");
  assertEquals(kind(r.roots[0], "response").name, "greeting");
});

test("responds 'nothing' for void input", async () => {
  const r = await brain("");
  assertEquals(kind(r.roots[0], "response").name, "nothing");
});

test("each phase output is returned separately", async () => {
  const r = await brain("hi");
  assert(r.phases, "brain() must expose separate phase outputs");
  assertEquals(Object.keys(r.phases), ["understand", "think", "solve", "express", "structure"]);
  assertEquals(r.phases.understand.length, r.phases.think.length);
  assertEquals(r.phases.think.length, r.phases.solve.length);
  assertEquals(r.phases.solve.length, r.phases.express.length);
  assertEquals(r.phases.express.length, r.phases.structure.length);
});

test("understand phase contains perception but not thought", async () => {
  const r = await brain("hi");
  const understand = r.phases.understand[0];
  assert(kind(understand, "language") !== null, "understand recognizes language");
  assertEquals(kind(understand, "thought"), null, "think has not run yet");
  assertEquals(kind(understand, "response"), null, "solve has not run yet");
});

test("think phase consumes understand output and adds a thought", async () => {
  const r = await brain("hi");
  const think = r.phases.think[0];
  assert(kind(think, "thought") !== null, "think adds a thought node");
  assertEquals(kind(think, "response"), null, "solve has not run yet");
});

test("solve phase consumes think output and adds a response", async () => {
  const r = await brain("hi");
  const solve = r.phases.solve[0];
  assert(kind(solve, "response") !== null, "solve adds a response node");
  assertEquals(kind(solve, "response").name, "greeting");
});

test("final roots match the structure phase output", async () => {
  const r = await brain("hi");
  assertEquals(r.roots, r.phases.structure);
});

test("a multi-word signal is perceived as one thing per word", async () => {
  const r = await brain("hi two");
  assertEquals(r.roots.length, 2, "one root per token");
  assertEquals(r.roots[0].state.identity, "hi");
  assertEquals(r.roots[1].state.identity, "two");
  assertEquals(kind(r.roots[0], "language").state.matches[0].lang, "english");
  assertEquals(kind(r.roots[1], "response").name, "2");
});

test("each word of a phrase is solved individually", async () => {
  const r = await brain("hello one");
  assertEquals(kind(r.roots[0], "response").name, "greeting");
  assertEquals(kind(r.roots[1], "response").name, "1");
});

test("a phrase is bound into a sentence response", async () => {
  const r = await brain("hi two");
  const sentence = r.roots[0].branch.find(
    (b) => b.kind === "response" && b.name === "sentence",
  );
  assert(sentence !== null, "multi-word input gets a sentence response");
  assertEquals(sentence.state.parts, ["greeting", "2"]);
  assertEquals(sentence.state.text, "hi two");
});

test("single-word input is not treated as a sentence", async () => {
  const r = await brain("hi");
  const sentence = r.roots[0].branch.find(
    (b) => b.kind === "response" && b.name === "sentence",
  );
  assertEquals(sentence, undefined, "single word has no sentence response");
});

test("a greeting is an action, not a thing", async () => {
  const r = await brain("hi");
  assertEquals(kind(r.roots[0], "entity"), null, "a greeting is no entity");
  const action = kind(r.roots[0], "action");
  assert(action !== null, "greeting -> communication -> action");
  assertEquals(action.state.concept, 277);
});

test("solve infers nonliving for a numeral", async () => {
  const r = await brain("two");
  const entity = kind(r.roots[0], "entity");
  assertEquals(entity.name, "nonliving");
});

test("nothing is inferred from the part of speech alone", async () => {
  const r = await brain("is");
  assertEquals(kind(r.roots[0], "thought").state.thought.pos, "verb");
  assertEquals(kind(r.roots[0], "entity"), null, "a verb names no term, so no category");
  assertEquals(kind(r.roots[0], "action"), null);
});

test("express derives a greeting for an interjection", async () => {
  const r = await brain("hi");
  const expr = kind(r.roots[0], "express");
  assert(expr !== null, "express node added");
  assertEquals(expr.name, "Hello!");
});

test("express derives a numeral reply from the meaning", async () => {
  const r = await brain("two");
  const expr = kind(r.roots[0], "express");
  assertEquals(expr.name, "It is 2.");
});

test("express derives a verb reply", async () => {
  const r = await brain("is");
  const expr = kind(r.roots[0], "express");
  assertEquals(expr.name, "Yes, it to be.");
});

test("a subject-predicate sentence is parsed into a structure tree", async () => {
  const r = await brain("a cat is two");
  assertEquals(r.roots.length, 1, "a parseable sentence becomes one structured root");
  assertEquals(r.roots[0].kind, "sentence");
  const names = (r.roots[0].branch || []).map((b) => b.kind);
  assert(names.includes("subject"), "sentence has a subject");
  assert(names.includes("predicate"), "sentence has a predicate");
});

test("parsed structure keeps each word's solved meaning", async () => {
  const r = await brain("a cat is two");
  const exprNames = [];
  const walk = (n) => {
    if (n.kind === "express") exprNames.push(n.name);
    (n.branch || []).forEach(walk);
  };
  r.roots.forEach(walk);
  assert(exprNames.includes("It is 2."), "numeral leaf keeps its reply");
});

test("an unparseable phrase stays as separate word roots", async () => {
  const r = await brain("hi two");
  assertEquals(r.roots.length, 2);
  assertEquals(r.roots[0].state.identity, "hi");
  assertEquals(r.roots[1].state.identity, "two");
});

test("single words are not structured", async () => {
  const r = await brain("cat");
  assertEquals(r.roots.length, 1);
  assertEquals(r.roots[0].kind, "thing");
});

test("a noun's entity is derived from the world, not its part of speech", async () => {
  const r = await brain("cat");
  const entity = kind(r.roots[0], "entity");
  assert(entity !== null, "a known noun gets an entity from the world");
  assertEquals(entity.name, "living");
  assertEquals(entity.state.concept, 83);
});

test("a plant is living too — the is chain decides, not the word", async () => {
  const r = await brain("tree");
  assertEquals(kind(r.roots[0], "entity").name, "living");
});

test("a fruit is nonliving even though it is a noun", async () => {
  const r = await brain("apple");
  assertEquals(kind(r.roots[0], "entity").name, "nonliving");
});

test("a numeral's entity comes from the world term, not the pos case", async () => {
  const r = await brain("two");
  const entity = kind(r.roots[0], "entity");
  assertEquals(entity.name, "nonliving");
  assertEquals(entity.state.concept, 115);
});

test("the thought carries the world term the word names", async () => {
  const r = await brain("dog");
  assertEquals(kind(r.roots[0], "thought").state.thought.concept, 82);
});

test("a word with no world term names none", async () => {
  const r = await brain("the");
  assertEquals(kind(r.roots[0], "thought").state.thought.concept, null);
});

test("an unknown word gets no entity", async () => {
  const r = await brain("xyz");
  assertEquals(kind(r.roots[0], "entity"), null);
});

test("a recursive rule parses — the parser backtracks past a short match", async () => {
  const r = await brain("hi hi");
  assertEquals(r.roots.length, 1, "sentence -> interjection sentence");
  assertEquals(r.roots[0].kind, "sentence");
  const inner = r.roots[0].branch.find((b) => b.kind === "sentence");
  assert(inner !== null, "the tail is itself a sentence");
});

test("an interjection followed by a full sentence parses", async () => {
  const r = await brain("hi a cat is two");
  assertEquals(r.roots.length, 1);
  const inner = r.roots[0].branch.find((b) => b.kind === "sentence");
  assert(inner !== null);
  assertEquals(
    inner.branch.map((b) => b.kind),
    ["subject", "predicate"],
  );
});

test("a fragment is not passed off as a sentence", async () => {
  const r = await brain("a cat");
  assertEquals(r.roots.length, 2, "no sentence rule accepts a bare subject");
  assertEquals(r.roots[0].kind, "thing");
});

test("the root is named after the grammar's start symbol", async () => {
  const r = await brain("a cat is two");
  assertEquals(r.roots[0].kind, "sentence");
  assertEquals(r.roots[0].name, "sentence");
});

test("a word named after a perception node keeps its perception", async () => {
  const r = await brain("shape");
  const qualities = (r.roots[0].branch || []).filter((b) => b.kind === "quality");
  assertEquals(qualities.length, 2, "visual and sound survive a name collision");
});

test("a signal of nothing but space is nothing", async () => {
  const r = await brain("   ");
  assertEquals(r.roots[0].kind, "void");
  assertEquals(kind(r.roots[0], "response").name, "nothing");
});

test("a signal of marks still exists, it just holds no word", async () => {
  const r = await brain("?");
  assertEquals(r.roots[0].kind, "thing");
  assertEquals(r.roots[0].state.exists, true);
});

test("a phrase carries one sentence result, on the root that opens it", async () => {
  const r = await brain("hi two");
  const sentences = r.roots.map((n) =>
    (n.branch || []).filter((b) => b.kind === "response" && b.name === "sentence"),
  );
  assertEquals(sentences[0].length, 1);
  assertEquals(sentences[1].length, 0);
});

test("express replies to the phrase, not only to its words", async () => {
  const r = await brain("hi two");
  const expr = [];
  const walk = (n) => {
    if (n.kind === "express") expr.push(n.name);
    (n.branch || []).forEach(walk);
  };
  r.roots.forEach(walk);
  assert(expr.includes("I understand."), "a bound phrase is understood");
});

test("which symbols are vowels comes from the data", async () => {
  const r = await brain("hi");
  const sound = (r.roots[0].branch || []).find((b) => b.name === "sound");
  assertEquals(sound.state.phonetics, [
    { char: "h", isVowel: false },
    { char: "i", isVowel: true },
  ]);
});
