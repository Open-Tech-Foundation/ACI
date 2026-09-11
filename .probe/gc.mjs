import { openBrain } from '../src/index.js';
for (const s of ['anu changed the destination to mumbai','the sky turns red','anu changed the flight to mumbai']) {
  const b = openBrain('sqlite::memory:');
  const r = await b.brain(s);
  console.log(JSON.stringify(s), '=>', r.expression?.state?.says);
  console.log(b.serialize().split('rules:')[0].split('nodes:')[1].trim());
  console.log('---');
}
