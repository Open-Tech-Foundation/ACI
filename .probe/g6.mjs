import { openBrain } from '../src/index.js';
for (const q of ['who arrived?','who arrived first?','who arrived before john?','sara arrived?']) {
  const b = openBrain('sqlite::memory:');
  await b.brain('sara arrived before john');
  await b.brain('john arrived before mike');
  console.log(JSON.stringify(q), '=>', (await b.brain(q)).expression?.state?.says);
}
