import { openBrain } from '../src/index.js';
for (const run of [
  ['anu booked a flight to delhi'],
  ['sara booked a flight to delhi'],
  ['anu is a person', 'anu booked a flight to delhi'],
  ['the flight is to delhi', 'the flight is to mumbai', 'what is the destination?'],
  ['the flight is to delhi', 'where is the flight to?'],
]) {
  const b = openBrain('sqlite::memory:');
  let last;
  for (const s of run) { last = await b.brain(s); }
  console.log(JSON.stringify(run.join(' | ')), '=>', last.expression?.state?.says);
}
