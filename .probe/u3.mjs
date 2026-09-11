import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const run of [
  ['the box weighs 10 gram', 'the cup weighs 5 kilogram', 'is the box heavier than the cup?'],
  ['the run takes 2 hour', 'the walk takes 30 minute', 'is the run longer than the walk?'],
  ['is 5 gram heavier than 10 gram?'],
]) {
  const b = openBrain('sqlite::memory:');
  for (const s of run) console.log(JSON.stringify(s), '=>', (await b.brain(s, P)).expression?.state?.says);
  console.log('---');
}
