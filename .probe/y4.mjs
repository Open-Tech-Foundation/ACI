import { openBrain } from '../src/index.js';
import { serialize, clear } from '../src/graph.js';
clear();
const { brain } = openBrain('sqlite::memory:');
for (const s of ['the hotel is called rose', 'i saw a rose', 'the rose has 20 beds', 'what does rose have?', 'roses are red']) {
  const r = await brain(s);
  console.log(JSON.stringify(s), '=>', r.expression?.state?.says);
}
console.log(serialize());
