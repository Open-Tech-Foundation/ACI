import { openBrain } from '../src/index.js';
const P = { from: 29 };
const b = openBrain('sqlite::memory:');
for (const s of ['the box weighs 5 gram', 'the cup weighs 10 gram', 'is the box heavier than the cup?', 'is the cup heavier than the box?']) {
  console.log(JSON.stringify(s), '=>', (await b.brain(s, P)).expression?.state?.says);
}
