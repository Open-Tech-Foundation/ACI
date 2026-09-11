import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const s of ['a tiger is big?','a cat is small?','a cat is big?','a cat is warm?','a tiger is warm?','a rose is warm?','a cat is alive?','a cat is a tiger?','a dog is warm?']) {
  const b = openBrain('sqlite::memory:');
  console.log(JSON.stringify(s), '=>', (await b.brain(s, P)).expression?.state?.says);
}
