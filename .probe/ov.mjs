import { openBrain } from '../src/index.js';
const P = { from: 29 };
const runs = [
  ['a bird flies', 'a penguin is a bird', 'a penguin flies?'],
  ['a bird flies', 'a penguin is a bird', 'a penguin does not fly', 'a penguin flies?', 'a bird flies?'],
  ['luna is a cat', 'luna is warm?', 'luna is small?'],
];
for (const run of runs) {
  const b = openBrain('sqlite::memory:');
  for (const s of run) console.log(JSON.stringify(s), '=>', (await b.brain(s, P)).expression?.state?.says);
  console.log('---');
}
