import { openBrain } from '../src/index.js';
const P = { from: 29 };
const b = openBrain('sqlite::memory:');
for (const s of ['a drum is cold', 'a drum is hot']) {
  const r = await b.brain(s, P);
  console.log(JSON.stringify(s), '=>', r.expression?.state?.says, '| learned:', JSON.stringify(r.learned));
}
