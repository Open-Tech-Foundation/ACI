import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");

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
  // A greeting is a communication, and a communication is an action: something
  // happened, and the brain took it in rather than claiming to have known it.
  assertEquals(r.expression.name, "learn");
  assertEquals(r.expression.state.says, "I understand.");
  assertEquals(r.expression.state.bound, true);
});

test("the whole expression keeps what was said about each thing", async () => {
  const r = await brain("a cat is two?");
  assertEquals(
    r.expression.branch.map((b) => b.state.says),
    [
      // An article marks which one is meant and names nothing of its own.
      "I don't understand.",
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
  const r = await brain("a cat is two?");
  assertEquals(r.roots.length, 1, "a parseable sentence becomes one structured root");
  assertEquals(r.roots[0].kind, "sentence");
  const names = (r.roots[0].branch || []).map((b) => b.kind);
  assert(names.includes("subject"), "sentence has a subject");
  assert(names.includes("predicate"), "sentence has a predicate");
});

test("parsed structure keeps each word's solved meaning", async () => {
  const r = await brain("a cat is two?");
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
  const r = await brain("hi a cat is two?");
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
  const r = await brain("a cat is two?");
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
  const r = await brain("the apple is a tree?");
  const truth = kind(r.roots[0], "standing");
  assert(truth !== null, "a signal naming a relation makes a claim");
  assertEquals(truth.name, "against");
  assertEquals(truth.state, { subject: 79, relation: 294, object: 33, negated: false });
  assertEquals(r.expression.name, "deny");
  assertEquals(r.expression.name, "deny");
});

test("a claim the world bears out is affirmed when asked", async () => {
  const r = await brain("a cat is a cat?");
  assertEquals(kind(r.roots[0], "standing").name, "held");
  assertEquals(r.expression.name, "affirm");
  assertEquals(r.expression.name, "affirm");
});

test("the word is names the world's own is relation", async () => {
  const r = await brain("is");
  const thought = kind(r.roots[0], "thought");
  assertEquals(thought.state.thought.concept, 294);
  assertEquals(kind(r.roots[0], "relation").kind, "relation");
});

test("a signal that names no relation makes no claim", async () => {
  const r = await brain("hi hi");
  assertEquals(kind(r.roots[0], "standing"), null);
});

test("a claim about an ancestor holds", async () => {
  assertEquals((await brain("a dog is an organism?")).expression.name, "affirm");
  assertEquals((await brain("a bird is an animal?")).expression.name, "affirm");
  assertEquals((await brain("an apple is a food?")).expression.name, "affirm");
});

test("a claim the chain does not bear out is denied", async () => {
  assertEquals((await brain("a tree is an animal?")).expression.name, "deny");
  assertEquals((await brain("an apple is an organism?")).expression.name, "deny");
});

test("the is relation runs one way only", async () => {
  assertEquals((await brain("a person is a human?")).expression.name, "affirm");
  // Not denied — nothing says a human cannot be a person, only that the world
  // does not hold it. Failing to find a path is not proof of the opposite.
  assertEquals((await brain("a human is a person?")).expression.state.says, "I don't know.");
});

test("a claim resolves across the whole chain, however long", async () => {
  const r = await brain("an apple is a thing?");
  assertEquals(kind(r.roots[0], "standing").name, "held");
  assertEquals(kind(r.roots[0], "standing").state, { subject: 79, relation: 294, object: 2, negated: false });
});

test("a numeral can stand as the subject of a claim", async () => {
  const r = await brain("three is a number?");
  assertEquals(kind(r.roots[0], "standing").state, { subject: 116, relation: 294, object: 100, negated: false });
  assertEquals(r.expression.name, "affirm");
});

test("the brain is a thing that is not alive and has a mind", async () => {
  const r = await brain("you");
  const entity = kind(r.roots[0], "entity");
  assertEquals(entity.name, "nonliving");
  assertEquals(entity.state.concept, 296, "the self term");
  assert(
    entity.branch.some((b) => b.kind === "mind"),
    "mindedness is a second axis, not a third kind of thing",
  );
});

test("being alive and having a mind are separate axes", async () => {
  const cat = kind((await brain("cat")).roots[0], "entity");
  assertEquals(cat.name, "living");
  assertEquals(cat.branch.some((b) => b.kind === "mind"), false, "not taught yet");

  const apple = kind((await brain("apple")).roots[0], "entity");
  assertEquals(apple.name, "nonliving");
  assertEquals(apple.branch.length, 0);
});

test("a claim can be made over the has relation, not only is", async () => {
  const r = await brain("you have a mind?");
  const truth = kind(r.roots[0], "standing");
  assertEquals(truth.name, "held");
  assertEquals(truth.state, { subject: 296, relation: 295, object: 230, negated: false });
  assertEquals(r.expression.name, "affirm");
});

test("the self is a thing, and not an animal", async () => {
  assertEquals((await brain("you are a thing?")).expression.name, "affirm");
  assertEquals(
    (await brain("you are an animal?")).expression.name, "deny",
    "a thing is physical or abstract, never both",
  );
});


test("a question is told from a statement by the language's own mark", async () => {
  assertEquals((await brain("a cat is an animal?")).expression.state.mood, "ask");
  assertEquals((await brain("a cat is an animal")).expression.state.mood, "tell");
});

test("asked, the brain answers the claim", async () => {
  assertEquals((await brain("a cat is an animal?")).expression.name, "affirm");
  assertEquals((await brain("a cat is a plant?")).expression.name, "deny");
});

test("told what it already holds, the brain simply understands", async () => {
  const held = await brain("a cat is an animal");
  assertEquals(held.expression.name, "understood");
  assertEquals(held.expression.state.says, "I know.", "composed, not written anywhere");
  assertEquals(held.learned, null, "nothing new to keep");
});

test("told something new, the brain learns it and hands it back", async () => {
  forget();
  const r = await brain("a cat has a mind");
  assertEquals(kind(r.roots[0], "learn").state, {
    subject: 83,
    relation: 295,
    object: 230,
    quantity: null,
    made: null,
    not: false,
  });
  assertEquals(r.expression.name, "learn", "it took in what it did not hold");
  assertEquals(r.learned, {
    terms: [{ id: 83, name: "cat", links: [{ rel: 295, to: 230 }] }],
  });
  forget();
});

test("a claim that would close a loop is refused, not learned", async () => {
  forget();
  // The world holds person -> human, so human -> person cannot also hold.
  const r = await brain("a human is a person");
  assertEquals(kind(r.roots[0], "refuse").name, "loop");
  assertEquals(kind(r.roots[0], "learn"), null);
  assertEquals(r.expression.name, "deny");
  assertEquals(r.learned, null);
});

test("a question is never learned from", async () => {
  const r = await brain("a cat has a mind?");
  assertEquals(kind(r.roots[0], "learn"), null);
  assertEquals(r.learned, null);
});

test("a signal with no claim is unaffected by the mark", async () => {
  assertEquals((await brain("hi")).expression.name, "greet");
  assertEquals((await brain("hi?")).expression.name, "greet");
});

test("asked its name, the brain asks about its self term", async () => {
  const r = await brain("what is your name?");
  const answer = kind(r.roots[0], "answer");
  assertEquals(answer.state.subject, 296, "it asked about the self");
  assertEquals(answer.state.relation, 138, "by the name relation");
});

test("a name is a fact in memory, said as it was given", async () => {
  // The runtime loaded what this instance is; no language has a word for it,
  // and none needs to — a name is not translated.
  assertEquals((await brain("what is ur name?")).expression.state.says, "ACI");
  // `you` is not a possessive, and a possessive is what this position takes.
  assertEquals((await brain("what is you name?")).expression.name, "unknown");
});

test("the same signal points elsewhere when it came from elsewhere", async () => {
  // A pointer holds nothing of its own: what `i` lands on is the circumstance
  // of this one signal, and the runtime is the only thing that knows it.
  assertEquals((await brain("i am a machine?", { from: 45 })).expression.name, "affirm");
  assertEquals((await brain("i am a machine?", { from: 508 })).expression.name, "deny");
});

test("told nothing about where a signal came from, the brain does not guess", async () => {
  const r = await brain("i am a machine?");
  assertEquals(kind(r.roots[0], "standing"), null, "there was nothing to make a claim about");
  assertEquals(r.expression.state.says, "I don't understand.");
});

test("the signal arrived here, so what it points to is the self", async () => {
  const r = await brain("you are a machine?", { from: 45 });
  assertEquals(kind(r.roots[0], "standing").state.subject, 296);
  assertEquals(r.expression.name, "affirm");
});

test("identity is what the world says it is, not anything the engine holds", async () => {
  assertEquals((await brain("you are a machine?")).expression.name, "affirm");
  assertEquals((await brain("you have a memory?")).expression.name, "affirm");
  assertEquals((await brain("you are a computer?")).expression.name, "affirm");
  assertEquals((await brain("you are a tool?")).expression.name, "deny");
  assertEquals((await brain("you are an organism?")).expression.name, "deny");
});

test("a question solves for the hole rather than checking a claim", async () => {
  const r = await brain("an apple is what?");
  const answer = kind(r.roots[0], "answer");
  assertEquals(answer.state, { subject: 79, relation: 294, found: [73] });
  assertEquals(r.expression.state.says, "fruit");
});

test("the term given is the one asked about, wherever the hole falls", async () => {
  const before = await brain("what is a hyena?");
  const after = await brain("a hyena is what?");
  assertEquals(before.expression.state.says, "mammal");
  assertEquals(after.expression.state.says, "mammal");
});

test("a question over a relation other than is answers with all it found", async () => {
  const r = await brain("you have what?");
  assertEquals(kind(r.roots[0], "answer").state.relation, 295);
  // Two links, so two things said: naming the first of them would be picking.
  assertEquals(kind(r.roots[0], "answer").state.found, [230, 561]);
  assertEquals(r.expression.state.says, "mind, memory");
});

test("a more specific relation takes precedence over is", async () => {
  // "what is your name" names both `is` and `name`; the name relation wins.
  assertEquals(kind((await brain("what is your name?")).roots[0], "answer").state.relation, 138);
});

test("two terms and a relation is still a claim, not a question", async () => {
  const r = await brain("a cat is an animal?");
  assert(kind(r.roots[0], "standing") !== null);
  assertEquals(kind(r.roots[0], "answer"), null);
});

test("a walk that came back empty answers with nothing, and says so", async () => {
  forget();
  const r = await brain("a peacock has what?");
  const answer = kind(r.roots[0], "answer");
  assert(answer !== null, "the question the brain asked itself is on the tree");
  assertEquals(answer.state.found, [], "and it found nothing");
  // Nothing is what it found, the way zero is what a count of nothing finds.
  assertEquals(r.expression.state.says, "none");
  forget();
});

test("failing to find a path is not proof of the opposite", async () => {
  // position and state are both properties, and nothing says a property may be
  // only one of them.
  const r = await brain("up is a fear?");
  assertEquals(kind(r.roots[0], "standing").name, "absent");
  assertEquals(r.expression.name, "unsure");
  assertEquals(r.expression.state.says, "I don't know.");
});

test("terms that exclude each other make a claim false, not unknown", async () => {
  for (const q of ["a cat is a number?", "two is an animal?", "an apple is an organism?"]) {
    const r = await brain(q);
    assertEquals(kind(r.roots[0], "standing").name, "against", q);
    assertEquals(r.expression.name, "deny", q);
  }
});

test("exclusion is read off the kinds, however far apart they sit", async () => {
  // cat -> animal -> organism -> physical-thing, two -> number -> abstract-thing,
  // and physical-thing stands `different` to abstract-thing.
  assertEquals(kind((await brain("a cat is two?")).roots[0], "standing").name, "against");
});

test("only a claim about kind can be excluded", async () => {
  // A peacock and a mind are different kinds, but having one is not being one.
  const r = await brain("a peacock has a mind?");
  assertEquals(kind(r.roots[0], "standing").name, "absent", "not denied by exclusion");
});

test("a contradicted claim is refused rather than learned", async () => {
  forget();
  const r = await brain("a cat is two");
  assertEquals(kind(r.roots[0], "refuse").name, "contradiction");
  assertEquals(kind(r.roots[0], "learn"), null);
  assertEquals(r.learned, null);
  assertEquals(r.expression.name, "deny");
  forget();
});

test("a number beside a thing says how many of it there are", async () => {
  const r = await brain("two dog");
  const dog = r.roots[1];
  assertEquals(dog.state.identity, "dog");
  assertEquals(kind(dog, "quantity").state.concept, 115, "the term for two");
});

test("the number is read off the order, from either side", async () => {
  const before = await brain("three cat");
  assertEquals(kind(before.roots[1], "quantity").state.concept, 116);
});

test("a number is not a count of itself", async () => {
  const r = await brain("one two three");
  for (const n of r.roots) assertEquals(kind(n, "quantity"), null);
});

test("a thing standing alone is not quantified", async () => {
  assertEquals(kind((await brain("elephant")).roots[0], "quantity"), null);
});

test("the count survives into the structured signal", async () => {
  const r = await brain("two dog is an animal?");
  const leaves = [];
  const walk = (n) => {
    if (n.kind === "thing") leaves.push(n);
    (n.branch || []).forEach(walk);
  };
  r.roots.forEach(walk);
  const dog = leaves.find((n) => n.state.identity === "dog");
  assertEquals(kind(dog, "quantity").state.concept, 115, "no longer dropped");
});

test("only a thing carries a count, never a relation", async () => {
  const r = await brain("two dog is an animal?");
  const leaves = [];
  const walk = (n) => {
    if (n.kind === "thing") leaves.push(n);
    (n.branch || []).forEach(walk);
  };
  r.roots.forEach(walk);
  assertEquals(kind(leaves.find((n) => n.state.identity === "is"), "quantity"), null);
});

test("the brain counts what the world holds, and says the number", async () => {
  assertEquals((await brain("how many season?")).expression.state.says, "four");
  assertEquals((await brain("how many weather?")).expression.state.says, "eight");
  assertEquals((await brain("how many colour?")).expression.state.says, "ten");
});

test("nothing to count is zero, not silence", async () => {
  const r = await brain("how many chameleon?");
  assertEquals(kind(r.roots[0], "count").state.members, 0);
  assertEquals(r.expression.state.says, "zero");
});

test("counting past what the world names invents no term, and still answers", async () => {
  // Twenty-five mammals, and no single word in English for twenty-five.
  const r = await brain("how many mammal?");
  assertEquals(kind(r.roots[0], "count").name, "beyond", "no term was invented for it");
  assertEquals(r.expression.state.says, "25", "and the language can still write it");
});

test("the count is the terms the world holds, not a fact stored anywhere", async () => {
  const r = await brain("how many season?");
  const counted = kind(r.roots[0], "count");
  assertEquals(counted.state.members, 4);
  assertEquals(counted.state.total, 117, "the term for four");
});

test("the brain adds and subtracts, and the world only names the numbers", async () => {
  assertEquals((await brain("two plus three?")).expression.state.says, "five");
  assertEquals((await brain("five minus three?")).expression.state.says, "two");
  assertEquals((await brain("nine plus one?")).expression.state.says, "ten");
  assertEquals((await brain("seven minus seven?")).expression.state.says, "zero");
});

test("the sum is computed, not looked up", async () => {
  const r = await brain("two plus three?");
  const sum = kind(r.roots[0], "sum");
  assertEquals(sum.state.left, 2);
  assertEquals(sum.state.right, 3);
  assertEquals(sum.state.value, 5, "a number, not a term");
  assertEquals(sum.state.term, 118, "and then the term that names it");
});

test("a result the world has no term for is written, never named", async () => {
  // Twenty-three is a number the brain can reach and English cannot say in one
  // word; below zero the world has no term at all. Neither is invented — the
  // sum stands beyond what the world names, and the language writes it out.
  const sum = await brain("twenty plus three?");
  assertEquals(kind(sum.roots[0], "sum").name, "beyond");
  assertEquals(kind(sum.roots[0], "sum").state.value, 23);
  assertEquals(sum.expression.state.says, "23");
  assertEquals((await brain("seven minus nine?")).expression.state.says, "-2");
});

test("the brain compares two numbers", async () => {
  assertEquals((await brain("one less three?")).expression.name, "affirm");
  assertEquals((await brain("three more one?")).expression.name, "affirm");
  assertEquals((await brain("one more three?")).expression.name, "deny");
});

test("comparison is decided by value, never by a link in the world", async () => {
  const r = await brain("three more one?");
  const truth = kind(r.roots[0], "standing");
  // Decided by the values, and nothing in the world was walked. A truth node
  // joins terms wherever it came from, so terms are what it keeps.
  assertEquals(truth.state.subject, 116);
  assertEquals(truth.state.object, 114);
  assertEquals(r.expression.name, "affirm");
});

test("a plural is understood as the word it comes from", async () => {
  assertEquals((await brain("dogs are animals?")).expression.name, "affirm");
  assertEquals((await brain("tigers are mammals?")).expression.name, "affirm");
  assertEquals((await brain("apples are fruits?")).expression.name, "affirm");
});

test("no plural is written down anywhere", async () => {
  assertEquals(
    (await brain("how many seasons?")).expression.state.says,
    (await brain("how many season?")).expression.state.says,
    "the plural counts what the singular counts",
  );
});

test("a claim may be about anything that exists, not only a thing", async () => {
  assertEquals((await brain("gravity is a force?")).expression.name, "affirm");
  assertEquals((await brain("up is a position?")).expression.name, "affirm");
  assertEquals((await brain("red is a colour?")).expression.name, "affirm");
  assertEquals((await brain("fear is a feeling?")).expression.name, "affirm");
});

test("opposites exclude each other", async () => {
  assertEquals((await brain("up is a down?")).expression.name, "deny");
  assertEquals((await brain("near is a far?")).expression.name, "deny");
});

test("the copula joins a claim, it is never one of the things joined", async () => {
  // "what is your name" names both `is` and `name`; only `name` is the claim,
  // and `is` is not the thing being asked about either.
  assertEquals(kind((await brain("what is your name?")).roots[0], "answer").state.subject, 296);
  assertEquals((await brain("what is gravity?")).expression.state.says, "force");
});

test("a hole is a word the language marks as one, not any word without a term", async () => {
  // `a` has no term behind it and is not a hole; `what` is.
  const claim = await brain("gravity is a force?");
  assert(kind(claim.roots[0], "standing") !== null, "an article did not make it a question");
  const asked = await brain("what is gravity?");
  assert(kind(asked.roots[0], "answer") !== null);
});

test("the world can be counted by any of its shelves", async () => {
  assertEquals((await brain("how many colour?")).expression.state.says, "ten");
  assertEquals((await brain("how many feeling?")).expression.state.says, "seven");
  assertEquals((await brain("how many amphibian?")).expression.state.says, "two");
});

test("a denial is knowledge, where not finding a path is only ignorance", async () => {
  forget();
  assertEquals((await brain("up is a fear?")).expression.state.says, "I don't know.");
  await brain("up is not a fear");
  assertEquals(
    (await brain("up is a fear?")).expression.name, "deny",
    "now it knows, rather than merely not knowing",
  );
  forget();
});

test("the brain answers a denied question", async () => {
  assertEquals((await brain("a cat is not a plant?")).expression.name, "affirm");
  assertEquals((await brain("a cat is not an animal?")).expression.name, "deny");
});

test("a denial the world contradicts is refused", async () => {
  forget();
  const r = await brain("a cat is not an animal");
  assertEquals(kind(r.roots[0], "refuse").name, "contradiction");
  assertEquals(r.learned, null);
  forget();
});

test("a denied link joins nothing", async () => {
  forget();
  await brain("up is not a fear");
  assertEquals((await brain("up is a fear?")).expression.name, "deny");
  assertEquals((await brain("up is a position?")).expression.name, "affirm",
    "the denial cut nothing else");
  forget();
});

test("which word denies is the language's", async () => {
  const r = await brain("up is not a fear?");
  assertEquals(kind(r.roots[0], "standing").state.negated, true);
});

test("a hole may name the relation it asks across", async () => {
  // Asked who a thing is, the answer is its name; asked what it is, the answer
  // is what it is a kind of. Both are holes, and they differ only in what they
  // ask across — `who` names the name relation itself, so the brain walks that
  // one instead of the `is` beside it. Nothing in the brain tells them apart.
  assertEquals((await brain("who are you")).expression.state.says, "ACI");
  assertEquals((await brain("what are you")).expression.state.says, "computer");
});

test("asking who a thing is, and asking its name, are one question", async () => {
  assertEquals(
    (await brain("who are you")).expression.state.says,
    (await brain("what is your name")).expression.state.says,
  );
});

test("a thing with no name has none to give, and that is an answer", async () => {
  assertEquals((await brain("who is a cat")).expression.state.says, "none");
  assertEquals((await brain("what is a cat")).expression.state.says, "mammal");
});

test("a hole falls wherever its language puts it", async () => {
  assertEquals((await brain("a cat is who")).expression.state.says, "none");
  assertEquals((await brain("a cat is what")).expression.state.says, "mammal");
});
