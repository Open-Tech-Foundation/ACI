import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const s of [
  'i have two dogs, one is white and another is grey',
  'i have two dogs, one is white and the other is grey',
  'i have two dogs',
]) {
  const b = openBrain('sqlite::memory:');
  const r = await b.brain(s, P);
  console.log(JSON.stringify(s), '=>', r.expression?.state?.says);
  console.log('   ', b.serialize().split('actions:')[0].replace(/\s+/g,' ').trim());
}
