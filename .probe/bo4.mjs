import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const w of ['both','they']) {
  const b = openBrain('sqlite::memory:');
  await b.brain('i have two dogs', P);
  const r = await b.brain(`${w} are white`, P);
  console.log(w, '| learned:', JSON.stringify(r.learned));
  console.log('   nodes:', JSON.stringify(b.graph().nodes));
}
