import { openBrain } from '../src/index.js';
import { serialize, clear } from '../src/graph.js';
clear();
const { brain } = openBrain('sqlite::memory:');
for (const s of ['the apple is company', 'i have two apples in a cart', 'i cut one apple']) {
  const r = await brain(s);
  console.log(JSON.stringify(s), '=>', r.expression?.state?.says);
}
console.log(serialize());
