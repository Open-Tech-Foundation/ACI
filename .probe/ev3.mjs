import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const s of ['a tree fell', 'a tree fell on the road', 'a tree fell in the evening']) {
  const b = openBrain('sqlite::memory:');
  const r = await b.brain(s, P);
  console.log('>', s);
  console.log(r.graph?.serialize?.() ?? '(no graph)');
  console.log('---');
}
