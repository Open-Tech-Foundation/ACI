import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const pair of [['i have two dogs','both are white'],['i have two dogs','they are white']]) {
  const b = openBrain('sqlite::memory:');
  await b.brain(pair[0], P);
  const r = await b.brain(pair[1], P);
  console.log(JSON.stringify(pair[1]), '=>', r.expression?.state?.says, '|', b.serialize().split('actions:')[0].replace(/\s+/g,' ').trim());
}
