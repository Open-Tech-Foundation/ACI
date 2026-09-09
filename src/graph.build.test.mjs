import { test, assert, assertEquals } from 'runtime:test';
import { openBrain } from './index.js';
import { graph, serialize } from './graph.js';
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
  assertEquals(held.nodes.length, 1);
  assertEquals(held.nodes[0].said, 'john');
  // Nobody said what john is. Being held by something makes him a thing and
  // no more than that.
  assertEquals(held.nodes[0].of, world.anchors.thing);

  // Five apples introduces no apple: a quantity of a kind names no particular
  // thing, so what the fact reaches is the kind the world already had.
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
  const held = await said('the sky is blue');
  assertEquals(held.nodes, [], 'nothing was introduced; two concepts were joined');
  assertEquals(held.facts.length, 1);
});

test("a doing carries the part each thing played in it", async () => {
  const held = await said('john gives 2 apples to sam');
  assertEquals(held.nodes.map((one) => one.said), ['john', 'sam']);
  assertEquals(held.actions.length, 1);
  const [doing] = held.actions;
  assertEquals(world.term(doing.of).name, 'give');
  assertEquals(doing.roles[world.anchors.agent], 'n1');
  assertEquals(doing.roles[world.anchors.destination], 'n2');
  assertEquals(doing.properties.count, 2);
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
  assertEquals(held.nodes.map((one) => one.said.split('#')[0]), ['john', 'basket']);
  // A basket was said of in particular, so it is a thing; apples were a
  // quantity of a kind, so they are not.
  assertEquals(held.nodes[1].of, 307);
  assertEquals(held.facts.length, 1);
  assertEquals(held.actions.length, 1);
  assertEquals(held.actions[0].properties.count, 3);
});

test("a thing an earlier signal brought in is the same thing later", async () => {
  const held = await said('john has 5 apples', 'john is taller than sam');
  // The second signal makes no call for john — he was already here — and he is
  // still a node in it.
  assertEquals(held.nodes.map((one) => one.said), ['john', 'sam']);
  assertEquals(held.facts[0].parts, ['n1', 'n2']);
});

test("the graph says what is in it, under four headings, always", async () => {
  await said('john has 5 apples');
  const shown = serialize(world);
  assert(shown.includes('nodes:'), shown);
  assert(shown.includes('facts:'), shown);
  assert(shown.includes('actions:'), shown);
  assert(shown.includes('rules:'), shown);
  assert(shown.includes('n1  john  type: entity -> thing'), shown);
  assert(shown.includes('{count: 5}'), shown);
});
