import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const run of [
  ['the apple weighs 2 gram', 'the apple weighs how many gram?'],
  ['the apple weighs 1.5 gram', 'the apple weighs how many gram?'],
  ['the box is 1.5 metre big', 'the box is how many metre big?'],
]) {
  const b = openBrain('sqlite::memory:');
  for (const s of run) {
    const r = await b.brain(s, P);
    console.log(JSON.stringify(s), '=>', r.expression?.state?.says);
  }
  console.log('---');
}
