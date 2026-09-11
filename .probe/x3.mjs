import { openBrain } from '../src/index.js';
for (const s of ['a dog is a widget','apple is a fruit','apple is a widget','a company is a thing','apple is a shop']) {
  const { brain } = openBrain('sqlite::memory:');
  const r = await brain(s);
  console.log(JSON.stringify(s), '=>', r.expression?.state?.says);
}
