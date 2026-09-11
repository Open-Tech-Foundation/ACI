import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const s of ['the sky is blue, the grass is green','i have two dogs, one is white','a cat is an animal, a dog is an animal']) {
  const b = openBrain('sqlite::memory:');
  console.log(JSON.stringify(s), '=>', (await b.brain(s, P)).expression?.state?.says);
}
