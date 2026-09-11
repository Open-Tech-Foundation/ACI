import { openBrain } from '../src/index.js';
import { serialize } from '../src/graph.js';
const { brain } = openBrain('sqlite::memory:');
for (const s of ['apple is a company', 'what is apple?']) {
  const r = await brain(s);
  console.log(JSON.stringify(s), '=>', r.expression?.state?.says);
}
console.log(serialize());
