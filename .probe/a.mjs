import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const s of ['a cat is an animal?','a tiger is an animal?','a cat is a tiger?','a tiger is big?','a cat is small?']) {
  const b = openBrain('sqlite::memory:');
  console.log(JSON.stringify(s), '=>', (await b.brain(s, P)).expression?.state?.says);
}
