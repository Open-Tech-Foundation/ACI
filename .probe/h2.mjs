import { openBrain } from '../src/index.js';
const P = { from: 29 };
const b = openBrain('sqlite::memory:');
for (const s of ['a drum is cold','a drum is hot?','a drum is warm?']) {
  console.log(JSON.stringify(s), '=>', (await b.brain(s, P)).expression?.state?.says);
}
