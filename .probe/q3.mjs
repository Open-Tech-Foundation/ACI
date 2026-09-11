import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const s of ['tom put a book into a box','tom split a cake into three pieces','i split eight fruits into three groups']) {
  const b = openBrain('sqlite::memory:');
  const r = await b.brain(s, P);
  console.log(JSON.stringify(s), '=>', r.expression?.state?.says, '|', JSON.stringify(b.graph().actions));
}
