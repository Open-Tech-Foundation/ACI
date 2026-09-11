import { openBrain } from '../src/index.js';
const { brain } = openBrain('sqlite::memory:');
for (const s of ['the dog is river','a dog is a river','apple is a company','an apple is a company','the apple is a company']) {
  const { brain: b } = openBrain('sqlite::memory:');
  const r = await b(s);
  console.log(JSON.stringify(s), '=>', r.expression?.state?.says);
}
