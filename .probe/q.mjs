import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const s of ['i have eight fruits and split them into three groups','i have eight fruits','split them into three groups','i have eight fruits and put them into three groups']) {
  const b = openBrain('sqlite::memory:');
  const r = await b.brain(s, P);
  console.log(JSON.stringify(s), '=>', r.expression?.state?.says);
  console.log('   ', b.serialize().split('rules:')[0].replace(/\s+/g,' ').trim());
}
