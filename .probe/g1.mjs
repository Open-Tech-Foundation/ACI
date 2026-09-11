import { openBrain } from '../src/index.js';
const b = openBrain('sqlite::memory:');
for (const s of ['sara arrived before john','john arrived before mike','mike arrived before alex','who arrived first?']) {
  console.log(JSON.stringify(s), '=>', (await b.brain(s)).expression?.state?.says);
}
console.log(b.serialize());
