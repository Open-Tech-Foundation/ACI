import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const s of ['tom split a cake into three pieces','tom put a book into a box','tom put two books into a box']) {
  const b = openBrain('sqlite::memory:');
  const r = await b.brain(s, P);
  console.log(JSON.stringify(s), '\n  learned:', JSON.stringify(r.learned?.terms?.filter(t=>t.name.includes('#'))));
}
