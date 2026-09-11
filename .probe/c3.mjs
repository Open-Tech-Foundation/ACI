import { openBrain } from '../src/index.js';
const P = { from: 29 };
const b = openBrain('sqlite::memory:');
for (const s of ['if a drum is cold then a bell is red','a bell is red?','a drum is cold','a bell is red?']) {
  console.log(JSON.stringify(s), '=>', (await b.brain(s, P)).expression?.state?.says);
}
