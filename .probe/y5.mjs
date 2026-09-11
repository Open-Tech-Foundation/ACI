import { openBrain } from '../src/index.js';
import { serialize, clear } from '../src/graph.js';
clear();
const { brain } = openBrain('sqlite::memory:');
for (const s of ['two storms arrived']) {
  const r = await brain(s);
  console.log(JSON.stringify(s), '=>', r.expression?.state?.says);
}
console.log(serialize());
