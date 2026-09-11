import { openBrain } from '../src/index.js';
const P = { from: 29 };
const b = openBrain('sqlite::memory:');
for (const s of ['the run takes 2 hour', 'the walk takes 30 minute']) {
  const r = await b.brain(s, P);
  console.log(JSON.stringify(s), '=>', r.expression?.state?.says, '|', JSON.stringify(r.learned));
}
console.log(b.serialize().split('facts:')[0]);
