import { openBrain } from '../src/index.js';
const P = { from: 29 };
const b = openBrain('sqlite::memory:');
for (const s of ['the film is 2 hour long', 'the song is 30 minute long', 'is the film longer than the song?']) {
  const r = await b.brain(s, P);
  console.log(JSON.stringify(s), '=>', r.expression?.state?.says);
}
console.log(b.serialize().split('facts:')[0]);
