import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const s of ['one is white and another is grey','another is grey','the other is grey','i have two dogs and one is white']) {
  const b = openBrain('sqlite::memory:');
  const r = await b.brain(s, P);
  console.log(JSON.stringify(s), '=>', r.expression?.state?.says, '|', b.serialize().split('actions:')[0].replace(/\s+/g,' ').trim());
}
