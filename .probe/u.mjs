import { openBrain } from '../src/index.js';
const P = { from: 29 };
const b = openBrain('sqlite::memory:');
for (const s of ['is 5 kilogram heavier than 10 gram?', 'is 2 hour longer than 30 minute?', 'the box weighs 5 kilogram', 'the cup weighs 10 gram', 'is the box heavier than the cup?']) {
  console.log(JSON.stringify(s), '=>', (await b.brain(s, P)).expression?.state?.says);
}
