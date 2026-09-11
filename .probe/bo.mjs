import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const s of ['i have two dogs and both are white','i have two dogs, both are white','i have two dogs and one is white and another is grey']) {
  const b = openBrain('sqlite::memory:');
  const r = await b.brain(s, P);
  console.log(JSON.stringify(s), '=>', r.expression?.state?.says, '|', b.serialize().split('actions:')[0].replace(/\s+/g,' ').trim());
}
