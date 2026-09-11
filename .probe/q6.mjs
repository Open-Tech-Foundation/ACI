import { openBrain } from '../src/index.js';
import { serialize, clear } from '../src/graph.js';
const P = { from: 29 };
for (const s of ['i have red cars','i have two red cars','tom has two red cars','the two red cars are here']) {
  clear();
  const { brain } = openBrain('sqlite::memory:');
  const r = await brain(s, P);
  console.log(JSON.stringify(s), '=>', r.expression?.state?.says);
  console.log(serialize().split('facts:')[0].trim());
  console.log('---');
}
