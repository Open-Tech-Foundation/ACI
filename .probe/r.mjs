import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const run of [
  ['a drum is red or a drum is blue', 'a drum is red?', 'a drum is blue?'],
  ['a drum is cold', 'a drum becomes hot', 'a drum is hot?', 'a drum is cold?'],
]) {
  const { brain } = openBrain('sqlite::memory:');
  for (const s of run) {
    const r = await brain(s, P);
    console.log(JSON.stringify(s), '=>', r.expression?.state?.says);
  }
  console.log('---');
}
