import { openBrain } from '../src/index.js';
for (const run of [
  ['anu booked a flight to delhi','anu changed the destination of the flight to mumbai'],
  ['anu booked a flight to delhi','the destination is mumbai'],
  ['anu booked a flight to delhi','anu changed the destination to mumbai'],
]) {
  const b = openBrain('sqlite::memory:');
  let last;
  for (const s of run) last = await b.brain(s);
  console.log(JSON.stringify(run[run.length-1]), '=>', last.expression?.state?.says);
  console.log(b.serialize().split('actions:')[0].trim());
  console.log('---');
}
