import { test, assert, assertEquals } from 'runtime:test';
import { openGraph, DONE, TO_COME, PENDING } from './working-memory.js';

// Phase one of GRAPH.md: what the graph holds, and what is read back off it.
// Every case here is one the design note works through.

test("a concept fact makes no node; only what is introduced becomes one", () => {
  const g = openGraph();
  g.concept('violin', { is: 'instrument' });
  assertEquals(g.all('node'), []);
  const one = g.node('violin');
  assertEquals(g.all('node'), [one]);
  assert(g.isA(one, 'instrument'));
});

test("a property may be held, or come from the kind", () => {
  const g = openGraph();
  g.concept('husband', { is: 'person', has: { sex: 'male' } });
  const john = g.node('husband');
  const sky = g.node('sky', { colour: 'blue' });
  assertEquals(g.propertyOf(sky, 'colour'), 'blue');
  // Nobody said it. Being a husband carries it.
  assertEquals(g.propertyOf(john, 'sex'), 'male');
  assertEquals(g.propertyOf(john, 'height'), undefined);
});

test("the latest change wins and the history keeps the rest", () => {
  const g = openGraph();
  const trip = g.node('booking', { destination: 'delhi' });
  const changed = g.action('change-property', { target: trip });
  g.property(trip, { destination: 'mumbai' });
  assertEquals(g.propertyOf(trip, 'destination'), 'mumbai');
  assertEquals(g.propertyOf(trip, 'destination', g.before(changed)), 'delhi');
});

test("told there is none is not nobody having said", () => {
  const g = openGraph();
  const eight = g.node('invoice');
  const receipt = g.node('receipt');
  g.fact('holding', { subject: eight, what: 'receipt', instance: receipt }, { props: { count: 1 } });

  const seven = g.node('invoice');
  const none = g.fact('holding', { subject: seven, what: 'document', instance: null }, { props: { count: 0 } });

  const nine = g.node('invoice');

  // The place is there and nothing is in it.
  assert('instance' in g.item(none).slots);
  assertEquals(g.item(none).slots.instance, null);
  assertEquals(g.propertyOf(none, 'count'), 0);
  // Nobody said anything about nine, so there is no holding to read.
  assertEquals(g.all('fact').filter((f) => g.item(f).slots.subject === nine), []);
});

test("a collection is counted by what was stated and what has moved since", () => {
  const g = openGraph();
  const tree = g.node('tree');
  const birds = g.collection('bird', { count: 10 });
  // Landing: movement with an open source. It carries no quantity of its own,
  // so it puts the collection somewhere without changing how many there are.
  g.action('movement', { what: birds, source: null, destination: tree });
  assertEquals(g.count(birds), 10);

  const away = g.action('movement', { what: birds, source: tree, destination: null, quantity: 3 });
  assertEquals(g.count(birds), 7);
  assertEquals(g.count(birds, g.before(away)), 10);
});

test("a total is worked out when asked, and looking back costs nothing", () => {
  const g = openGraph();
  const pallet = g.node('pallet');
  const crates = g.collection('crate', { count: 2 });
  g.action('movement', { what: crates, source: null, destination: pallet });
  assertEquals(g.count(crates), 2);

  const added = g.action('movement', { what: crates, source: null, destination: pallet, quantity: 1 });
  assertEquals(g.count(crates), 3);
  assertEquals(g.count(crates, g.before(added)), 2);
});

test("a collection carries its own properties", () => {
  const g = openGraph();
  const red = g.collection('ball', { count: 4, colour: 'red' });
  const blue = g.collection('ball', { count: 3, colour: 'blue' });
  assertEquals(g.propertyOf(red, 'colour'), 'red');
  assertEquals(g.count(blue), 3);
  assertEquals(g.all('node'), []);
});

test("a sum is added across the members, and refuses where one is not measured", () => {
  const g = openGraph();
  const ledger = g.collection('invoice');
  const first = g.node('invoice', { amount: 800 });
  const second = g.node('invoice', { amount: 200 });
  g.collect(ledger, first);
  const joined = g.collect(ledger, second);
  assertEquals(g.count(ledger), 2);
  assertEquals(g.sum(ledger, 'amount'), 1000);
  assertEquals(g.sum(ledger, 'amount', joined - 1), 800);

  const unmeasured = g.node('invoice');
  g.collect(ledger, unmeasured);
  assertEquals(g.sum(ledger, 'amount'), null);
});

test("the extreme member, and no answer where two are level", () => {
  const g = openGraph();
  const load = g.collection('crate');
  const light = g.node('crate', { weight: 4 });
  const heavy = g.node('crate', { weight: 9 });
  g.collect(load, light);
  g.collect(load, heavy);
  assertEquals(g.highest(load, 'weight'), heavy);
  assertEquals(g.lowest(load, 'weight'), light);

  const level = g.node('crate', { weight: 9 });
  g.collect(load, level);
  assertEquals(g.highest(load, 'weight'), null);
});

test("an action carries when it stands", () => {
  const g = openGraph();
  const meera = g.node('person');
  const dev = g.node('person');
  const gave = g.action('transfer', { agent: meera, target: dev, what: 'book', quantity: 2 });
  const will = g.action('transfer', { agent: meera, target: dev, what: 'book', quantity: 2 }, { when: TO_COME });
  assertEquals(g.item(gave).when, DONE);
  assertEquals(g.item(will).when, TO_COME);
  assertEquals(g.history(), [gave, will]);
});

test("a recorded action can be pointed at, and two records may stand for one", () => {
  const g = openGraph();
  const twelve = g.node('invoice');
  const manager = g.node('person');
  const approval = g.action('change-property', {
    agent: manager,
    target: twelve,
    property: 'approved',
    value: 'yes',
  });
  // A property on an action, like a property on anything else.
  g.property(approval, { backdated: true });
  assertEquals(g.propertyOf(approval, 'backdated'), true);
  // Who approved it: read off the recorded action.
  assertEquals(g.item(approval).slots.agent, manager);

  const first = g.node('entry');
  const second = g.node('entry');
  g.fact('record', { subject: first, object: approval });
  g.fact('record', { subject: second, object: approval });
  const standing = g.all('fact').filter((f) => g.item(f).slots.object === approval);
  assertEquals(standing.length, 2);
});

test("an action may sit in either slot of a fact", () => {
  const g = openGraph();
  const sara = g.action('arrival', { agent: g.node('person') });
  const john = g.action('arrival', { agent: g.node('person') });
  const order = g.fact('before', { subject: sara, object: john });
  assertEquals(g.item(order).slots.subject, sara);
  assertEquals(g.item(order).slots.object, john);
});

test("a denial stands against, and is not an absence", () => {
  const g = openGraph();
  const ledger = g.node('ledger');
  const total = g.collection('invoice');
  const matched = g.fact('match', { subject: total, object: ledger }, { denied: true });
  assertEquals(g.item(matched).denied, true);
});

test("a pointer lands where exactly one candidate fits", () => {
  const g = openGraph();
  g.concept('husband', { is: 'person', has: { sex: 'male' } });
  g.concept('wife', { is: 'person', has: { sex: 'female' } });
  const john = g.node('husband');
  const mary = g.node('wife');
  g.context.reach(john);
  g.context.reach(mary);
  assertEquals(g.context.focus(), [mary, john]);
  assertEquals(g.context.point({ is: 'person', has: { sex: 'male' } }), john);
  assertEquals(g.context.point({ is: 'person', has: { sex: 'female' } }), mary);
});

test("everything an action names comes into reach, so a pointer with two fits refuses", () => {
  const g = openGraph();
  g.concept('person', {});
  const ravi = g.node('person');
  const sam = g.node('person');
  const gave = g.action('transfer', { agent: ravi, target: sam, what: 'book', quantity: 2 });
  g.context.saw(gave);
  assertEquals(g.context.focus(), [gave, ravi, sam]);
  // Two people were just spoken of and neither is meant more than the other.
  assertEquals(g.context.point({ is: 'person' }), null);
  assertEquals(g.context.spoken(), gave);
});

test("a name given in this conversation lands on what it was given to", () => {
  const g = openGraph();
  const anu = g.node('person');
  g.context.name('anu', anu);
  assertEquals(g.context.named('anu'), anu);
  assertEquals(g.context.named('bala'), null);
});

// What governs: a standing instruction, a condition asked of the graph, an
// action waiting on one, and what is owed.

test("a condition is a question asked of the graph, not an arriving action", () => {
  const g = openGraph();
  g.concept('hot', { on: 'temperature', from: 30 });
  const bedroom = g.node('room', { temperature: 22 });
  const cooler = g.node('appliance');
  const switchOn = g.action('change-property', { target: cooler, property: 'on', value: 'yes' }, {
    on: { of: bedroom, property: 'temperature', is: 'hot' },
  });
  assertEquals(g.whenOf(switchOn), PENDING);
  assertEquals(g.settle(), []);

  g.property(bedroom, { temperature: 31 });
  assertEquals(g.settle(), [switchOn]);
  assertEquals(g.whenOf(switchOn), DONE);
});

test("a state on a scale is reached, not equalled", () => {
  const g = openGraph();
  g.concept('freezing', { on: 'temperature', to: 0 });
  const pipe = g.node('pipe', { temperature: 5 });
  const cold = { of: pipe, property: 'temperature', is: 'freezing' };
  assertEquals(g.holds(cold), false);
  g.property(pipe, { temperature: -2 });
  assertEquals(g.holds(cold), true);
});

test("nothing is compared action to action; what changed is a total", () => {
  const g = openGraph();
  const paid = g.collection('payment');
  const enough = { of: paid, total: 'amount', atLeast: 500 };
  const tell = g.action('telling', { target: null }, { on: enough });

  g.collect(paid, g.node('payment', { amount: 300 }));
  assertEquals(g.settle(), [], "three hundred is not five hundred");

  g.collect(paid, g.node('payment', { amount: 200 }));
  assertEquals(g.settle(), [tell], "the total reached it, and the total is a state");
});

test("a produced fact needs nobody, and stops being so when its condition does", () => {
  const g = openGraph();
  g.concept('freezing', { on: 'temperature', to: 0 });
  const pipe = g.node('pipe', { temperature: 4 });
  g.rule({
    on: { each: 'pipe', property: 'temperature', is: 'freezing' },
    then: { property: 'frozen', value: 'yes' },
  });
  assertEquals(g.propertyOf(pipe, 'frozen'), undefined);

  const dropped = g.property(pipe, { temperature: -2 });
  assertEquals(g.propertyOf(pipe, 'frozen'), 'yes');
  // Worked out, never written: read at the moment before, it was not frozen.
  assertEquals(g.propertyOf(pipe, 'frozen', g.moment() - 1), undefined);
});

test("an owed action does nothing by itself, and that is what makes it reportable", () => {
  const g = openGraph();
  g.rule({
    on: { each: 'invoice', property: 'amount', above: 500 },
    then: { action: 'approval', slots: { by: null } },
    owed: true,
  });
  const big = g.node('invoice', { amount: 800 });
  const small = g.node('invoice', { amount: 200 });

  assertEquals(g.owed().map((one) => one.on), [big], "only the one over five hundred");
  // The instruction put nothing anywhere. Someone has to.
  const manager = g.node('person');
  g.action('approval', { agent: manager, target: big });
  assertEquals(g.owed(), []);
  assertEquals(g.propertyOf(small, 'approved'), undefined);
});

test("an occurrence is paired against the history, and an unanswered one is still owed", () => {
  const g = openGraph();
  const tray = g.node('tray');
  g.rule({
    on: { occurred: 'property-change', slots: { property: 'inspection', value: 'failed' } },
    then: { action: 'movement', slots: { destination: tray } },
    owed: true,
  });

  const part = g.node('part');
  g.action('property-change', { target: part, property: 'inspection', value: 'failed' });
  assertEquals(g.owed().length, 1, "nobody has sent it anywhere");

  g.action('movement', { what: part, source: null, destination: tray });
  assertEquals(g.owed(), [], "the thing simply stops answering the question");

  // Failing again is a second demand, and the first answer does not answer it.
  g.action('property-change', { target: part, property: 'inspection', value: 'failed' });
  assertEquals(g.owed().length, 1);
});

test("an instruction is stored once, however many records it governs", () => {
  const g = openGraph();
  const standing = g.rule({
    on: { each: 'invoice', property: 'amount', above: 500 },
    then: { action: 'approval', slots: { by: null } },
    owed: true,
  });
  for (const amount of [900, 700, 600, 100]) g.node('invoice', { amount });
  assertEquals(g.governing(), [standing]);
  assertEquals(g.owed().length, 3);
  // It never entered the history: nothing occurred.
  assertEquals(g.history(), []);
});

test("an instruction may say what it is about, rather than what it matched", () => {
  const g = openGraph();
  const road = g.node('road');
  g.rule({
    on: { each: 'sky', property: 'raining', is: 'yes' },
    then: { of: road, property: 'wet', value: 'yes' },
  });
  const sky = g.node('sky');
  // Putting a claim as a condition is not saying it.
  assertEquals(g.propertyOf(sky, 'raining'), undefined);
  assertEquals(g.propertyOf(road, 'wet'), undefined);

  g.property(sky, { raining: 'yes' });
  assertEquals(g.propertyOf(road, 'wet'), 'yes');
  assertEquals(g.propertyOf(sky, 'wet'), undefined, "the rain is not what got wet");
});

// The graph says what is in it. Nothing that looks at it describes it.

test("the graph says what is in it, and spells only what it was told is a concept", () => {
  const g = openGraph();
  g.concept('husband', { is: 'person', has: { sex: 'male' } });
  const john = g.node('husband');
  const crates = g.collection('crate', { count: 2 });
  g.context.name('john', john);
  const moved = g.action('movement', { what: crates, source: null, destination: john, quantity: 1 });
  g.context.saw(moved);

  const said = g.text();
  assert(said.includes('n1  husband  called john  (sex: male)'), said);
  assert(said.includes('c1  crate × 3'), said);
  // A quantity is a number, and nothing goes looking for a word for one.
  assert(said.includes('quantity: 1'), said);
  // The empty slot is said as one.
  assert(said.includes('source: —'), said);
  assert(said.includes('[done]'), said);
  assert(said.includes('focus  a1, c1, n1'), said);
});

test("what a thing is is not said the way a place with nothing in it is", () => {
  const g = openGraph();
  g.node(null);
  const said = g.text();
  assert(said.includes('n1  ?'), said);
});

test("an instruction and what it demands are said back", () => {
  const g = openGraph();
  g.rule({
    on: { each: 'invoice', property: 'amount', above: 500 },
    then: { action: 'approval', slots: { by: null } },
    owed: true,
  });
  g.node('invoice', { amount: 800 });
  const said = g.text();
  assert(said.includes('r1  on each invoice amount above 500 -> approval(by: —)  [owed]'), said);
  assert(said.includes('owed'), said);
  assert(said.includes('r1  n1'), said);
});
