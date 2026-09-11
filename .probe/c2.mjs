import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const s of ['the red box is inside the blue box','the box number 1 is red','the first box is red','i have two boxes','the first box is red and the second box is blue']) {
  const b = openBrain('sqlite::memory:');
  const r = await b.brain(s, P);
  console.log(JSON.stringify(s), '=>', r.expression?.state?.says, '|', b.serialize().split('facts:')[0].replace(/\n/g,' ').replace(/\s+/g,' ').trim());
}
