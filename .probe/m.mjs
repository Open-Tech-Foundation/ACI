import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const s of ['a man is walking','a man walks','a man walks to the shop']) {
  const b = openBrain('sqlite::memory:');
  const r = await b.brain(s, P);
  console.log(JSON.stringify(s), '=>', r.expression?.state?.says);
  const g = b.graph();
  console.log('  actions:', JSON.stringify(g.actions));
  console.log('  facts:', JSON.stringify(g.facts));
}
