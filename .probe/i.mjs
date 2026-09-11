import { openBrain } from '../src/index.js';
const P = { from: 29 };
const b = openBrain('sqlite::memory:');
for (const s of ['a human is warm','a man is warm?','a boy is warm?','a cat is warm?']) {
  console.log(JSON.stringify(s), '=>', (await b.brain(s, P)).expression?.state?.says);
}
