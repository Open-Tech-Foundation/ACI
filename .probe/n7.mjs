import { openBrain } from '../src/index.js';
import { serialize } from '../src/graph.js';
const { brain } = openBrain('sqlite::memory:');
for (const s of ['the dog is called river', 'what is river?', 'is river an animal?', 'river is brown']) {
  const r = await brain(s);
  console.log(JSON.stringify(s), '=>', r.expression?.state?.says ?? r.expression?.name, '|', JSON.stringify(r.learned));
}
console.log(serialize());
