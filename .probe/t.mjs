import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const s of ['tom gave a book to sam','tom put a book on a table','a man walks to a shop']) {
  const b = openBrain('sqlite::memory:');
  await b.brain(s, P);
  console.log(JSON.stringify(s), '\n  ', JSON.stringify(b.graph().actions));
}
