import { openBrain } from '../src/index.js';
import { serialize, clear } from '../src/graph.js';
for (const s of ['apple is red', 'apples are red', 'i ate two apples', 'i ate the apple', 'the apple is a fruit']) {
  clear();
  const { brain } = openBrain('sqlite::memory:');
  await brain('the shop is called apple');
  const r = await brain(s);
  console.log(JSON.stringify(s), '=>', r.expression?.state?.says);
  console.log(serialize().split('facts:')[0].trim());
  console.log('---');
}
