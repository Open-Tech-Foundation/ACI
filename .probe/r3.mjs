import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const run of [
  ['a drum is cold', 'a drum is hot', 'a drum is hot?', 'a drum is cold?'],
  ['the drum is in a box', 'the drum is in a shelf', 'the drum is in a box?'],
]) {
  const { brain } = openBrain('sqlite::memory:');
  for (const s of run) {
    const r = await brain(s, P);
    console.log(JSON.stringify(s), '=>', r.expression?.state?.says);
  }
  console.log('---');
}
