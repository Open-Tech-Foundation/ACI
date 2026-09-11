globalThis.QDBG = 1;
import { openBrain } from '../src/index.js';
import { clear } from '../src/graph.js';
const P = { from: 29 };
for (const s of ['i have a red car','i have two red cars']) {
  clear();
  const { brain } = openBrain('sqlite::memory:');
  await brain(s, P);
}
