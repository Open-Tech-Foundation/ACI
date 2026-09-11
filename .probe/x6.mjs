import { openBrain } from '../src/index.js';
import { serialize, clear } from '../src/graph.js';
const runs = [
  ['the shop is called apple', 'the apple has 3 products', 'what does apple have?'],
  ['a company is a thing', 'the company is called apple', 'the apple has 3 products'],
];
for (const run of runs) {
  clear();
  const { brain } = openBrain('sqlite::memory:');
  for (const s of run) {
    const r = await brain(s);
    console.log(JSON.stringify(s), '=>', r.expression?.state?.says);
  }
  console.log(serialize());
  console.log('===');
}
