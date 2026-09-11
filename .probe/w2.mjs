import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const run of [
  ['a storm causes a wind', 'what causes a wind?', 'why is a wind?', 'why a wind?'],
]) {
  const b = openBrain('sqlite::memory:');
  for (const s of run) console.log(JSON.stringify(s), '=>', (await b.brain(s, P)).expression?.state?.says);
}
