import { test, assert, assertEquals } from 'runtime:test';
import { openBrain } from './index.js';
import {
  TRANSFER, PROPERTY_CHANGE, HOLDING, PLACEMENT, COMPARISON, ORDER, PROPERTY, KIND,
} from './graph.js';
import { loadWorldFile } from './world.js';

// The conversation graph, built from the very basic inputs upward. Every case
// here is one signal in, and the graph the brain left behind. Nothing reads
// the brain's own phases: what is checked is what the graph holds.

const opened = openBrain('sqlite::memory:');
const { brain, forget, graph, serialize } = opened;
const { ranking, amounts } = opened.conversation;
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
  // How a thing is belongs to it, so nothing stands between the sky and blue.
  assertEquals(held.nodes[0].how.colour, 203);
  assertEquals(held.facts, []);
  assertEquals(held.context.focus, ['n1']);
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
  // Which property took the value, not only the value.
  assertEquals(took.actions[0].properties.colour, 202);
});

test("one relation says both a property and a kind, told apart by the other side", async () => {
  const blue = await said('the sky is blue');
  assertEquals(blue.facts, [], 'how a thing is is held on it, not between two');
  assertEquals(blue.nodes[0].how.colour, 203);

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
  // A comparison is made on a quantity, not on a state of one: `taller`
  // compares on how tall a thing is, and how tall a thing is, is its height.
  // So a thing said to be two metres and a thing said to be taller are
  // speaking of one quantity.
  assertEquals(taller.facts[0].properties.on, 2970);
  // Which is above is said by the order of the two, never by a flag naming
  // one of them.
  assertEquals(taller.facts[0].parts, ['n1', 'n2']);
});

test("a standing the brain has no primitive for keeps the world's own concept", async () => {
  const held = await said('tom is the father of sam');
  assertEquals(held.facts[0].of, 503, 'being a father is not one of the primitives');
  // And a father is what stands between two people, not a third beside them.
  assertEquals(held.nodes.map((one) => one.said), ['tom', 'sam']);
});

// Physical quantities. A thing has extent — it weighs so much, stands so
// high, is so warm — and each is an amount in a unit, held on the thing.

test("so much of something is not a kind of it", async () => {
  const held = await said('the room is 30 degree');
  // The weakest claim a signal can make is being, and it was all the brain had
  // to go on, so the room came out as a degree. A unit with a number beside it
  // names a stronger claim than being.
  assertEquals(held.facts, []);
  const [room] = held.nodes;
  // A degree can be nothing but temperature, so the unit answers which
  // quantity by itself and nothing is guessed.
  assertEquals(room.measures[0], { of: 186, amount: 30, unit: 623 });
});

test("a measure the brain cannot place is refused, not guessed at", async () => {
  // A metre serves a height, a length and a size alike, and nothing said
  // which. Choosing one would be a guess kept as fact.
  const open = await said('tom is 2 metre');
  assertEquals(open.nodes[0].measures, undefined, 'nothing was taken in');

  // Said which, it is taken: tall is a state of height.
  const told = await said('tom is 2 metre tall');
  assertEquals(told.nodes[0].measures[0], { of: 2970, amount: 2, unit: 621 });
});

test("a measure belongs on the thing, and the unit says of what", async () => {
  const weighed = await said('the box weighs 5 kilogram');
  // A kilogram can be nothing but weight, so weight is what was said.
  assertEquals(weighed.nodes[0].measures[0], { of: 184, amount: 5, unit: 620 });
  assertEquals(weighed.facts, [], 'how much a thing is, is its own');
});

test("a comparison said the other way round turns the same fact round", async () => {
  const held = await said('tom is shorter than sam');
  assertEquals(held.facts[0].of, COMPARISON);
  assertEquals(held.facts[0].properties.on, 2970, 'height, not shortness');
  assertEquals(held.facts[0].parts, ['n2', 'n1'], 'sam stands above tom');
});

test("where each thing stands on a quantity is counted, not stored", async () => {
  await said('tom is taller than sam', 'sam is taller than john');
  // A thing stands as high as the number of things it reaches down to, so
  // being above john comes out of the chain without anyone saying it.
  const at = ranking(2970);
  assertEquals([...at.values()].sort(), [1, 2, 3]);
  assertEquals(at.get('n1'), 3);
  assertEquals(at.get('n2'), 2);
  assertEquals(at.get('n3'), 1);
});

test("the same shape stands on every quantity, and the brain reads no word", () => {
  // Heavier, hotter, faster, bigger: four words, one shape. Each is a
  // comparison because the world says it compares on something.
  const rungs = async (lines, quantity) => {
    await said(...lines);
    return [...ranking(quantity).values()].sort();
  };
  return Promise.all([
    rungs(['the cow is heavier than the goat', 'the goat is heavier than the hen'], 184),
    rungs(['the oven is hotter than the room', 'the room is hotter than the fridge'], 186),
    rungs(['the car is faster than the bike', 'the bike is faster than the boat'], 324),
    rungs(['the box is bigger than the cup', 'the cup is bigger than the pin'], 183),
  ]).then((all) => {
    for (const found of all) assertEquals(found, [1, 2, 3]);
  });
});

test("a quantity taken from another thing is between the two, not on either", async () => {
  const held = await said(
    'alice is 2 metre from the tree',
    'bob is 5 metre from the tree',
    'charlie is 10 metre from the tree',
  );
  // Every other quantity is of one thing; a distance is between two, so it
  // stands on what joins them and belongs to neither.
  assertEquals(held.nodes.every((one) => one.measures == null), true);
  assertEquals(held.facts.length, 3);
  assertEquals(held.facts[0].properties.of, 252);
  assertEquals(held.facts[0].properties.amount, 2);

  // Which thing it is taken from has to be named: there is no distance
  // without saying from what.
  const tree = held.nodes.find((one) => one.said === 'tree').id;
  const far = amounts(252, tree);
  assertEquals([...far.values()], [2, 5, 10]);
  // And with real amounts, how much farther is answerable — an order alone
  // never could be.
  const of = (who) => far.get(held.nodes.find((one) => one.said === who).id);
  assertEquals(of('bob') - of('alice'), 3);
});

test("when a doing happened is held as a time, not as what it happened to", async () => {
  const held = await said('alice arrived at 8 hour', 'bob arrived at 9 hour');
  // Arriving at eight hours is not arriving at an hour the way one arrives at
  // a station. The brain reads no word for it: the world says an hour measures
  // time, and that is the whole of how it knows.
  assertEquals(held.actions[0].time, { amount: 8, unit: 220 });
  assertEquals(held.actions[1].time, { amount: 9, unit: 220 });
  assertEquals(Object.values(held.actions[0].roles).length, 1, 'only the one who arrived');
});

test("whose a thing is stands in the conversation, and they stand first", async () => {
  await forget();
  await brain('my house is red', { from: 26 });
  const held = graph();
  // The brain was already recording whose the house was; nothing held them,
  // so `my` looked dropped when it was only unread.
  assertEquals(held.nodes.length, 2);
  assertEquals(held.nodes[1].said.split('#')[0], 'house');
  // Told only that somebody is speaking, the brain holds them as a thing and
  // no more: what the world calls the term it was handed is not a claim about
  // who they are.
  assertEquals(held.nodes[0].of, 2);
  const holding = held.facts.find((one) => one.of === HOLDING);
  assertEquals(holding.parts, ['n1', 'n2'], 'whose it is, and what is theirs');
});
