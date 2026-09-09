import { test, assert, assertEquals } from 'runtime:test';
import { openBrain } from './index.js';
import {
  graph, serialize,
  TRANSFER, PROPERTY_CHANGE, HOLDING, PLACEMENT, COMPARISON, ORDER, PROPERTY, KIND,
} from './graph.js';
import { loadWorldFile } from './world.js';

// The conversation graph, built from the very basic inputs upward. Every case
// here is one signal in, and the graph the brain left behind. Nothing reads
// the brain's own phases: what is checked is what the graph holds.

const { brain, forget } = openBrain('sqlite::memory:');
const world = await loadWorldFile(new URL('../data/world.json', import.meta.url).pathname);

const said = async (...lines) => {
  await forget();
  for (const line of lines) await brain(line);
  return graph();
};

test("one thing this conversation brought in, and what it holds", async () => {
  const held = await said('john has 5 apples');
  // Both are things this conversation brought in. A quantity of a kind is one
  // too: five apples can be pointed back at, so saying it with a number does
  // not make it less of a thing.
  assertEquals(held.nodes.map((one) => one.said.split('#')[0]), ['john', 'apple']);
  assertEquals(held.nodes[1].count, 5);
  // Nobody said what john is. Being held by something makes him a thing and
  // no more than that — `thing` being a concept of the world like any other.
  assertEquals(held.nodes[0].of, world.anchors.thing);

  // What a fact reaches is the kind and how many, never the node: so many of
  // a kind cannot be handed to one thing until there is a way to say a group.
  assertEquals(held.facts.length, 1);
  const [holding] = held.facts;
  assertEquals(holding.parts[0], 'n1');
  assertEquals(world.term(holding.parts[1]).name, 'apple');
  assertEquals(holding.properties.count, 5);
  assertEquals(held.actions, []);
  assertEquals(held.rules, []);
});

test("two things this conversation brought in, and what stands between them", async () => {
  const held = await said('john is taller than sam');
  assertEquals(held.nodes.map((one) => one.said), ['john', 'sam']);
  assertEquals(held.facts.length, 1);
  assertEquals(held.facts[0].parts, ['n1', 'n2']);
  assertEquals(held.actions, []);
});

test("a claim about kinds makes no node at all", async () => {
  const held = await said('all cats are animals');
  assertEquals(held.nodes, [], 'nothing was introduced; two kinds were joined');
  assertEquals(held.facts.length, 1);
});

test("a thing spoken of in particular is a thing, and stays in reach", async () => {
  const held = await said('the sky is blue');
  // `the` says which one, so the sky is spoken of and not merely named. The
  // next signal may point back at it, which is what makes it a node.
  assertEquals(held.nodes.length, 1);
  assertEquals(held.nodes[0].said, 'sky');
  assertEquals(held.facts[0].parts[0], 'n1');
  // In reach: the sky itself, and the fact just said of it — both by the ids
  // the graph gave them.
  assertEquals(held.context.focus, ['n1', 'f1']);
});

test("a doing carries the part each thing played in it", async () => {
  const held = await said('john gives 2 apples to sam');
  assertEquals(held.nodes.map((one) => one.said.split('#')[0]), ['john', 'sam', 'apple']);
  assertEquals(held.actions.length, 1);
  const [doing] = held.actions;
  // The graph says the primitive, not the word. Giving is a transfer, and so
  // is putting; which word a language spells it with is that language's.
  assertEquals(doing.of, TRANSFER, 'the brain\'s own primitive, not the world\'s word');
  assert(serialize().includes('transfer(n1, from:'), serialize());
  assertEquals(doing.said, 282, 'what was said is kept beside it');
  // A transfer carries the brain's own parts: whoever did it stands first,
  // then where it came from and where it went. What moved is what it carries.
  assertEquals(doing.parts.doer, 'n1');
  assertEquals(doing.parts.to, 'n2');
  assertEquals(doing.parts.from, null, 'nothing said where it came from');
  assertEquals(doing.properties.thing, 79);
  assertEquals(doing.properties.count, 2);
});

test("two words for one primitive come out as one primitive", async () => {
  const giving = await said('john gives 2 apples to sam');
  const putting = await said('john put 2 apples into a basket');
  assertEquals(giving.actions[0].of, TRANSFER);
  assertEquals(putting.actions[0].of, TRANSFER);
  assert(giving.actions[0].said !== putting.actions[0].said, 'and what was said differs');
});

test("a primitive is known by its shape, not by a list of words", async () => {
  // Something comes to be with someone: either end may be open, and it is the
  // ends that say so.
  const held = await said('john gives 2 apples to sam');
  assertEquals(held.actions[0].of, TRANSFER);
  // Nobody said who holds what. What everyone holds afterwards follows from
  // the doing and is worked out when it is asked for, so it is not a fact.
  assertEquals(held.facts, []);
  // Holding is holding where it was said outright.
  assertEquals((await said('john has 5 apples')).facts[0].of, HOLDING);
});

test("a pointing word lands only where exactly one thing fits", async () => {
  const held = await said('tom has 5 books', 'he put three books into a bag');
  // A book cannot be what `he` stands for; tom can, and he is the only one
  // left, so the doing is his.
  assertEquals(held.actions[0].parts.doer, 'n1');
});

test("what governs is held apart, and its condition is never taken in", async () => {
  const held = await said('if metal is a food then blood is a liquid');
  assertEquals(held.rules.length, 1);
  const [standing] = held.rules;
  assertEquals(world.term(standing.on.subject).name, 'metal');
  assertEquals(world.term(standing.on.object).name, 'food');
  assertEquals(world.term(standing.then.subject).name, 'blood');
  assertEquals(world.term(standing.then.object).name, 'liquid');
  // Putting a claim as a condition is not saying it.
  assertEquals(held.facts, [], 'neither side of it was taken in as a fact');
});

test("two clauses in one signal build one graph", async () => {
  const held = await said('john has 5 apples and he put three apples into a basket');
  assertEquals(held.nodes.map((one) => one.said.split('#')[0]), ['john', 'apple', 'basket']);
  // A basket was said of in particular, so it is a thing; apples were a
  // quantity of a kind, so they are not.
  assertEquals(held.nodes[2].of, 307);
  assertEquals(held.facts.length, 1);
  assertEquals(held.actions.length, 1);
  assertEquals(held.actions[0].properties.count, 3);
});

test("a thing an earlier signal brought in is the same thing later", async () => {
  const held = await said('john has 5 apples', 'john is taller than sam');
  // The second signal makes no call for john — he was already here — and he is
  // still a node in it.
  assertEquals(held.nodes.map((one) => one.said.split('#')[0]), ['john', 'apple', 'sam']);
  // The graph is the conversation's, so the first signal's holding still
  // stands and the second signal's comparison is added after it.
  assertEquals(held.facts.length, 2);
  assertEquals(held.facts[0].parts[0], 'n1', 'john, from the signal before');
  // sam is the third thing this conversation brought in: john, the apples he
  // holds, and then sam.
  assertEquals(held.facts[1].parts, ['n1', 'n3']);
});

test("the graph says what is in it, under four headings, always", async () => {
  await said('john has 5 apples');
  const shown = serialize(world);
  assert(shown.includes('nodes:'), shown);
  assert(shown.includes('facts:'), shown);
  assert(shown.includes('actions:'), shown);
  assert(shown.includes('rules:'), shown);
  assert(shown.includes('n1  john  type: thing[2]'), shown);
  assert(shown.includes('{count: 5}'), shown);
});

// The primitives. Each is recognised by its shape or by what the world
// declares — never by a word, and never by a list of verbs.

test("a doing that moves something is a transfer; one that takes a value is not", async () => {
  const moved = await said('john gives 2 apples to sam');
  assertEquals(moved.actions[0].of, TRANSFER, 'it went somewhere');

  const took = await said('the sky turned red');
  assertEquals(took.actions[0].of, PROPERTY_CHANGE, 'nothing moved; a value was taken');
  assertEquals(took.actions[0].parts.thing, 'n1');
  assertEquals(took.actions[0].parts.took, 202);
});

test("one relation says both a property and a kind, told apart by the other side", async () => {
  const blue = await said('the sky is blue');
  assertEquals(blue.facts[0].of, PROPERTY);
  assertEquals(blue.facts[0].said, 294);

  const animal = await said('all cats are animals');
  assertEquals(animal.facts[0].of, KIND);
  assertEquals(animal.facts[0].said, 294, 'the same relation was said in both');
});

test("standings the world declares: holding, placement, order, comparison", async () => {
  assertEquals((await said('john has 5 apples')).facts[0].of, HOLDING);
  assertEquals((await said('the red box is inside the blue box')).facts[0].of, PLACEMENT);
  assertEquals((await said('sara arrived before john')).facts[0].of, ORDER);

  const taller = await said('john is taller than sam');
  assertEquals(taller.facts[0].of, COMPARISON);
  // A comparison is made on something; without the scale `taller` is a word.
  assertEquals(taller.facts[0].properties.on, 199);
});

test("a standing the brain has no primitive for keeps the world's own concept", async () => {
  const held = await said('tom is the father of sam');
  assertEquals(held.facts[0].of, 503, 'being a father is not one of the primitives');
  // And a father is what stands between two people, not a third beside them.
  assertEquals(held.nodes.map((one) => one.said), ['tom', 'sam']);
});
