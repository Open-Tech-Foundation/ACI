import { openBrain } from '../src/index.js';
const P = { from: 29 };
const cases = [
  ['i have two dogs and one is white and another is grey'],
  ['i have three boxes and one is red and another is blue'],
  ['tom has two cats and one is black'],
  ['i have two dogs'],
  ['i have two dogs and one is white', 'what colour is the dog?'],
  ['a box has four balls and one is red'],
  ['i have two dogs and both are white'],
];
for (const run of cases) {
  const b = openBrain('sqlite::memory:');
  let last;
  for (const s of run) last = await b.brain(s, P);
  console.log(JSON.stringify(run.join(' | ')), '=>', last.expression?.state?.says);
  console.log('   ', b.serialize().split('actions:')[0].replace(/\s+/g,' ').trim());
}
