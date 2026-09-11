import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const s of [
  'the sky is blue, the grass is green',
  'i have two dogs, one is white and another is grey',
  'i have two puppy dogs, one is white color and another is grey color',
  'a cat is an animal, a dog is an animal',
]) {
  const b = openBrain('sqlite::memory:');
  const r = await b.brain(s, P);
  console.log(JSON.stringify(s), '=>', r.expression?.state?.says);
  console.log('   ', b.serialize().split('actions:')[0].replace(/\s+/g,' ').trim());
}
