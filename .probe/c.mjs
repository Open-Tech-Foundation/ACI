import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const s of ['box 1 is red and box 2 is blue','box 1 is red and box 2 is red','the first box is red and the second box is red','box 1 is red']) {
  const b = openBrain('sqlite::memory:');
  const r = await b.brain(s, P);
  console.log(JSON.stringify(s), '=>', r.expression?.state?.says);
  console.log('   ', b.serialize().split('facts:')[0].replace(/\n/g,' ').trim());
}
