import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
const cases = [
  ['a kettle is heavy', 'is a kettle heavy?', 'affirm'],
  ['a lantern is bright', 'is a lantern bright?', 'affirm'],
  ['a rope is long', 'is a rope long?', 'affirm'],
  ['a stone is hard', 'is a stone hard?', 'affirm'],
  ['a sponge is soft', 'is a sponge soft?', 'affirm'],
  ['a river is deep', 'is a river deep?', 'affirm'],
  ['mira walked', 'did mira walk?', 'affirm'],
  ['kiran jumped', 'did kiran jump?', 'affirm'],
  ['nila laughed', 'did nila laugh?', 'affirm'],
  ['a bird can fly', 'can a bird fly?', 'affirm'],
  ['a fish can swim', 'can a fish swim?', 'affirm'],
  ['a shelf holds 3 cups', 'how many cups does the shelf hold?', 'answer'],
  ['mira has 2 keys', 'how many keys does mira have?', 'answer'],
  ['a wheel is part of a cart', 'is a wheel part of a cart?', 'affirm'],
  ['the lamp is on the table', 'where is the lamp?', 'answer'],
  ['mira gave a key to kiran', 'who has a key?', 'answer'],
  ['a cup is a container', 'is a cup a container?', 'affirm'],
  ['mira is taller than kiran', 'is kiran shorter than mira?', 'affirm'],
];
let ok = 0;
for (const [told, asked, want] of cases) {
  await forget();
  const a = await brain(told, { from: 29 });
  const b = await brain(asked, { from: 29 });
  const got = b.expression?.name;
  const pass = got === want;
  if (pass) ok += 1;
  console.log(`${pass ? '  ' : '!!'} ${asked.padEnd(42)} ${String(got).padEnd(10)} (told: ${a.expression?.name})`);
}
console.log(`\n${ok}/${cases.length}`);
