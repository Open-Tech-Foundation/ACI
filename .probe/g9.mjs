import { openBrain } from '../src/index.js';
const b = openBrain('sqlite::memory:');
for (const s of ['anu booked a flight to delhi','anu changed the destination to mumbai','anu cancelled the booking','what is the destination?']) {
  console.log(JSON.stringify(s), '=>', (await b.brain(s)).expression?.state?.says);
}
console.log(b.serialize());
