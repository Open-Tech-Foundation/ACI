import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const run of [
  ['the box is 2 metre big', 'the box is how many metre big?', 'how big is the box?'],
  ['the box is 1.5 metre big', 'how big is the box?'],
]) {
  const b = openBrain('sqlite::memory:');
  for (const s of run) console.log(JSON.stringify(s), '=>', (await b.brain(s, P)).expression?.state?.says);
  console.log('---');
}
