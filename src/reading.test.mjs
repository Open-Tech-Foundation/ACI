import { test, assert, assertEquals } from 'runtime:test';
import { openBrain } from './index.js';

// Hand the brain a signal and read back what it put into the conversation
// graph: nodes, collections, actions, facts and rules. Nothing is understood
// here that the brain does not already understand — this says what came of it.

const { read, forget } = openBrain('sqlite::memory:');

const said = async (...lines) => {
  await forget();
  let last;
  for (const line of lines) last = await read(line);
  return last;
};

test("a quantity of a kind is a collection, and the one holding it is a node", async () => {
  const laid = await said('meera has 5 books');
  assertEquals(laid.nodes.length, 1);
  assertEquals(laid.nodes[0].called, 'meera');
  assertEquals(laid.collections.length, 1);
  assertEquals(laid.collections[0].name, 'book');
  assertEquals(laid.collections[0].count, 5);
  // The word `meera` did not become a node of its own; it is what one is called.
  assertEquals(laid.graph.context.named('meera'), laid.nodes[0].id);
});

test("a doing becomes an action, and its roles become its slots", async () => {
  const laid = await said('meera gives 2 books to dev');
  assertEquals(laid.actions.length, 1);
  const [doing] = laid.actions;
  assertEquals(doing.name, 'give');
  const [giver, taker] = laid.nodes;
  assertEquals(doing.slots.agent, giver.id);
  assertEquals(doing.slots.destination, taker.id);
  assertEquals(doing.slots.quantity, 2);
  // Everything the doing names came into reach, so a pointer at one of two
  // people has two candidates and refuses.
  assertEquals(laid.graph.context.spoken(), doing.id);
});

test("a relation between two things becomes a fact", async () => {
  const laid = await said('arun is the father of bala');
  assertEquals(laid.actions, []);
  assertEquals(laid.facts.length, 1);
  const [held] = laid.facts;
  assertEquals(held.name, 'father');
  assertEquals(held.slots.subject, laid.nodes[0].id);
  assertEquals(held.slots.object, laid.nodes[1].id);
});

test("a condition and what stands on it become a rule, and nothing else", async () => {
  // A condition the brain cannot yet reach is kept rather than thrown away.
  const laid = await said('if metal is a food then blood is a liquid');
  assertEquals(laid.nodes, []);
  assertEquals(laid.actions, []);
  assertEquals(laid.facts, []);
  assertEquals(laid.rules.length, 1);
  const [standing] = laid.rules;
  assertEquals(standing.on.claim.subjectName, 'metal');
  assertEquals(standing.on.claim.objectName, 'food');
  assertEquals(standing.then.claim.subjectName, 'blood');
  assertEquals(standing.then.claim.objectName, 'liquid');
  // It never occurred, so it has no place in the history.
  assertEquals(laid.graph.history(), []);
  assertEquals(laid.graph.governing(), [standing.id]);
});

test("a rule is asked of the graph, and answers only where its condition stands", async () => {
  const laid = await said('if metal is a food then blood is a liquid');
  const { claim } = laid.rules[0].then;
  assertEquals(laid.graph.stands(claim), false, 'the condition does not stand');
  // Say the condition outright and what stands on it follows, with nothing
  // written down for it.
  const { claim: condition } = laid.rules[0].on;
  laid.graph.fact(condition.of, { subject: condition.subject, object: condition.object });
  assertEquals(laid.graph.stands(claim), true);
});

test("one conversation is one graph, and it keeps what earlier signals put in it", async () => {
  const laid = await said('meera has 5 books', 'arun is the father of bala');
  assertEquals(laid.nodes.length, 2, 'this signal introduced two');
  assertEquals(laid.graph.all('node').length, 3, 'the conversation has three');
  assertEquals(laid.graph.context.named('meera') != null, true);
});

test("a thing said of twice is one node, and what it holds is the same collection", async () => {
  await forget();
  const first = await read('meera has 5 books');
  const meera = first.nodes[0].id;
  const books = first.collections[0].id;

  const second = await read('meera gives 2 books to dev');
  assertEquals(second.nodes.length, 1, 'only dev is new');
  assertEquals(second.actions[0].slots.agent, meera);
  // What she has left is said of the collection she already had.
  const left = second.facts.find((one) => one.slots.subject === meera);
  assertEquals(left.slots.object, books);
  assertEquals(left.count, 3);
  await forget();
});

test("a signal the brain does not understand puts nothing in the graph", async () => {
  const laid = await said('there are 10 birds on a tree');
  assertEquals(laid.nodes, []);
  assertEquals(laid.collections, []);
  assertEquals(laid.actions, []);
  assertEquals(laid.facts, []);
  assertEquals(laid.rules, []);
  assert(laid.says != null);
});
