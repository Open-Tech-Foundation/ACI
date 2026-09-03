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
  assertEquals(Object.keys(r.phases), ["understand", "think", "solve", "structure", "judge", "express"]);
  assertEquals(r.phases.understand.length, r.phases.think.length);
  assertEquals(r.phases.think.length, r.phases.solve.length);
  assertEquals(r.phases.structure.length, r.phases.express.length);
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

test("final roots match the express phase output", async () => {
  const r = await brain("hi");
  assertEquals(r.roots, r.phases.express);
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

test("a bound signal gets one expression for the whole", async () => {
  const r = await brain("hi hi");
  assertEquals(r.expression.name, "understood");
  assertEquals(r.expression.state.says, "I understand.");
  assertEquals(r.expression.state.bound, true);
});

test("the whole expression keeps what was said about each thing", async () => {
  const r = await brain("a cat is two");
  assertEquals(
    r.expression.branch.map((b) => b.state.says),
    [
      'I recognise "indefinite article".',
      'I recognise "feline animal".',
      "Yes, it to be.",
      "It is 2.",
    ],
  );
});

test("a single word expresses itself", async () => {
  assertEquals((await brain("hi")).expression.state.says, "Hello!");
  assertEquals((await brain("two")).expression.state.says, "It is 2.");
});

test("an unbound signal has no one reply, but keeps the parts", async () => {
  const r = await brain("bird tree");
  assertEquals(r.expression.name, "unknown");
  assertEquals(r.expression.state.bound, false);
  assertEquals(r.expression.branch.length, 2);
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

test("express names the brain's intent, not a reply", async () => {
  const r = await brain("hi");
  const expr = kind(r.roots[0], "express");
  assert(expr !== null, "express node added");
  assertEquals(expr.name, "greet", "the node names the act, never the words");
});

test("the language the signal was recognized as voices the intent", async () => {
  assertEquals(kind((await brain("hi")).roots[0], "express").state.says, "Hello!");
  assertEquals(kind((await brain("two")).roots[0], "express").state.says, "It is 2.");
  assertEquals(kind((await brain("is")).roots[0], "express").state.says, "Yes, it to be.");
});

test("an intent is chosen from what the thing is", async () => {
  assertEquals(kind((await brain("two")).roots[0], "express").name, "count");
  assertEquals(kind((await brain("is")).roots[0], "express").name, "confirm");
  assertEquals(kind((await brain("cat")).roots[0], "express").name, "recognise");
  assertEquals(kind((await brain("xyz")).roots[0], "express").name, "unknown");
});

test("a signal in no language is left unsaid", async () => {
  const expr = kind((await brain("")).roots[0], "express");
  assertEquals(expr.name, "nothing");
  assertEquals(expr.state.says, null, "no language, nothing to say it in");
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
  assert(exprNames.includes("count"), "numeral leaf keeps its intent");
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

test("no word loses its own reply to the phrase", async () => {
  const r = await brain("one two three");
  const expr = [];
  const walk = (n) => {
    if (n.kind === "express") expr.push(n.name);
    (n.branch || []).forEach(walk);
  };
  r.roots.forEach(walk);
  assertEquals(expr, ["count", "count", "count"]);
  const said = [];
  const walkSays = (n) => {
    if (n.kind === "express") said.push(n.state.says);
    (n.branch || []).forEach(walkSays);
  };
  r.roots.forEach(walkSays);
  assertEquals(said, ["It is 1.", "It is 2.", "It is 3."]);
});

test("which symbols are vowels comes from the data", async () => {
  const r = await brain("hi");
  const sound = (r.roots[0].branch || []).find((b) => b.name === "sound");
  assertEquals(sound.state.phonetics, [
    { char: "h", isVowel: false },
    { char: "i", isVowel: true },
  ]);
});

test("the brain checks a claim against the world and denies it", async () => {
  const r = await brain("the apple is a tree");
  const truth = kind(r.roots[0], "truth");
  assert(truth !== null, "a signal naming a relation makes a claim");
  assertEquals(truth.name, "false");
  assertEquals(truth.state, { subject: 79, relation: 294, object: 33 });
  assertEquals(r.expression.name, "deny");
  assertEquals(r.expression.state.says, "No.");
});

test("a claim the world bears out is affirmed", async () => {
  const r = await brain("a cat is a cat");
  assertEquals(kind(r.roots[0], "truth").name, "true");
  assertEquals(r.expression.name, "affirm");
  assertEquals(r.expression.state.says, "Yes.");
});

test("the word is names the world's own is relation", async () => {
  const r = await brain("is");
  const thought = kind(r.roots[0], "thought");
  assertEquals(thought.state.thought.concept, 294);
  assertEquals(kind(r.roots[0], "relation").kind, "relation");
});

test("a signal that names no relation makes no claim", async () => {
  const r = await brain("hi hi");
  assertEquals(kind(r.roots[0], "truth"), null);
});

test("a claim about an ancestor holds", async () => {
  assertEquals((await brain("a dog is an organism")).expression.state.says, "Yes.");
  assertEquals((await brain("a bird is an animal")).expression.state.says, "Yes.");
  assertEquals((await brain("an apple is a food")).expression.state.says, "Yes.");
});

test("a claim the chain does not bear out is denied", async () => {
  assertEquals((await brain("a tree is an animal")).expression.state.says, "No.");
  assertEquals((await brain("an apple is an organism")).expression.state.says, "No.");
});

test("the is relation runs one way only", async () => {
  assertEquals((await brain("a person is a human")).expression.state.says, "Yes.");
  assertEquals((await brain("a human is a person")).expression.state.says, "No.");
});

test("a claim resolves across the whole chain, however long", async () => {
  const r = await brain("an apple is a thing");
  assertEquals(kind(r.roots[0], "truth").name, "true");
  assertEquals(kind(r.roots[0], "truth").state, { subject: 79, relation: 294, object: 2 });
});

test("a numeral can stand as the subject of a claim", async () => {
  const r = await brain("three is a number");
  assertEquals(kind(r.roots[0], "truth").state, { subject: 116, relation: 294, object: 100 });
  assertEquals(r.expression.state.says, "Yes.");
});
