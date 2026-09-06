import { test, assert, assertEquals } from 'runtime:test';
import { file } from 'runtime:fs';
import { brainFrom } from './brain.js';
import { fromSources } from './knowledge.js';
import { openBrain } from './index.js';
import { fromWorldData } from './world.js';

const says = (result) => result.expression.state.says;

test('concurrent turns reason over successive committed worlds', async () => {
  const { brain } = openBrain('sqlite::memory:');
  await Promise.all([brain('tilly is a heron'), brain('bobby is a dog')]);
  assertEquals((await brain('tilly is a heron?')).expression.name, 'affirm');
  assertEquals((await brain('bobby is a dog?')).expression.name, 'affirm');
  assertEquals((await brain('tilly is a dog?')).expression.name, 'deny');
});

test('separate joined clauses allocate separate individuals', async () => {
  const { brain } = openBrain('sqlite::memory:');
  const learned = (await brain('a basket holds three apple and a box holds five pear')).learned;
  assertEquals(learned.terms.filter((term) => term.individual).length, 2);
  assertEquals(says(await brain('the basket holds how many apples?')), 'three');
  assertEquals(says(await brain('the box holds how many pears?')), 'five');
  assertEquals((await brain('the basket holds how many pears?')).expression.name, 'unsure');
});

test('a joined change is refused when its whole closes a classification cycle', async () => {
  const { brain } = openBrain('sqlite::memory:');
  const result = await brain('a speed is a weight and a weight is a speed');
  assertEquals(result.expression.name, 'deny');
  assertEquals(result.learned, null);
});

test('existential scope does not become a universal kind fact', async () => {
  const { brain } = openBrain('sqlite::memory:');
  await brain('some crows are white');
  assertEquals((await brain('some crows are white?')).expression.name, 'affirm');
  assertEquals((await brain('all crows are white?')).expression.name, 'unsure');
});

test('hypothetical and modal mentions do not assert entities or facts', async () => {
  for (const statement of [
    'if a planet is a knife then zelda is a cat',
    'zelda might be a cat',
  ]) {
    const { brain } = openBrain('sqlite::memory:');
    assertEquals((await brain(statement)).learned, null);
    assertEquals((await brain('zelda is a cat?')).expression.name, 'unknown');
  }
});

test('a denied classification does not also assert the classification', async () => {
  const { brain } = openBrain('sqlite::memory:');
  await brain('zelda is not a cat');
  assertEquals((await brain('zelda is a cat?')).expression.name, 'deny');
});

test('negative kind knowledge is inherited consistently with positive knowledge', async () => {
  const { brain } = openBrain('sqlite::memory:');
  await brain('a crow does not have a bell');
  await brain('tilly is a crow');
  assertEquals((await brain('tilly has a bell?')).expression.name, 'deny');
});

test('quantity participates in truth and history is not counted twice', async () => {
  const { brain } = openBrain('sqlite::memory:');
  await brain('a basket holds three apple');
  assertEquals((await brain('the basket holds five apples?')).expression.name, 'deny');
  await brain('the basket holds five apple');
  assertEquals(says(await brain('the basket holds how many apples?')), 'five');
  assertEquals(says(await brain('the basket holds how many fruits?')), 'five');
});

test('a later placement is current while the earlier placement remains history', async () => {
  const { brain } = openBrain('sqlite::memory:');
  await brain('ravi is in chennai');
  await brain('ravi is in delhi');
  assertEquals(says(await brain('where is ravi')), 'delhi');
});

test('future events do not prove that a past event happened', async () => {
  const { brain } = openBrain('sqlite::memory:');
  await brain('i will go', { from: 508 });
  assertEquals((await brain('did i go?', { from: 508 })).expression.name, 'unsure');
});

test('grammar rule names do not carry statement semantics', async () => {
  const world = await file(new URL('../data/world.json', import.meta.url).pathname).json();
  const english = await file(new URL('../languages/en.json', import.meta.url).pathname).json();
  const renamed = structuredClone(english);
  renamed.grammar.rules = Object.fromEntries(
    Object.entries(renamed.grammar.rules).map(([name, rule]) => [
      name === 'clause' ? 'unit' : name,
      { ...rule, rules: rule.rules.map((text) => text.split(/\s+/).map((part) => part === 'clause' ? 'unit' : part).join(' ')) },
    ]),
  );
  const input = 'a cat is an animal and a tree is a plant';
  const original = brainFrom(input, fromSources({ world, languages: [english] }));
  const changed = brainFrom(input, fromSources({ world, languages: [renamed] }));
  assertEquals(changed.expression.name, original.expression.name);
  assertEquals(says(changed), says(original));
});

test('figure arithmetic stays exact beyond the safe integer range', async () => {
  const { brain } = openBrain('sqlite::memory:');
  assertEquals((await brain('9007199254740992 = 9007199254740993?')).expression.name, 'deny');
  assertEquals(says(await brain('9007199254740993 - 9007199254740992')), '1');
});

test('relations are direct unless world data marks them transitive', () => {
  const direct = fromWorldData({ relations: { is: 1 }, terms: [
    { id: 1, name: 'is', links: [] },
    { id: 2, name: 'near', links: [] },
    { id: 3, name: 'a', links: [{ rel: 2, to: 4 }] },
    { id: 4, name: 'b', links: [{ rel: 2, to: 5 }] },
    { id: 5, name: 'c', links: [] },
  ] });
  assertEquals(direct.isA(3, 5, 2), false);
  const transitive = fromWorldData({
    relations: direct.data.relations,
    terms: direct.data.terms.map((term) => term.id === 2 ? { ...term, transitive: true } : term),
  });
  assert(transitive.isA(3, 5, 2));
});
