import { openBrain } from '../src/index.js';
for (const s of ['sarah is a man','the cat is not an animal','a dog is a widget']) {
  const { brain } = openBrain('sqlite::memory:');
  const r = await brain(s);
  console.log(JSON.stringify(s), '=>', r.expression?.state?.says);
}
