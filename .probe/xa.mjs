import { openBrain } from '../src/index.js';
import { serialize, clear } from '../src/graph.js';
for (const s of ['apples are red', 'i ate two apples', 'i ate the apple']) {
  clear();
  const { brain } = openBrain('sqlite::memory:');
  await brain('the shop is called apple');
  const r = await brain(s);
  console.log(JSON.stringify(s), '=>', r.expression?.state?.says);
  console.log(serialize());
  console.log('---');
}
