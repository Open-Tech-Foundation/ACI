import { openBrain } from '../src/index.js';
const { brain, forget, serialize } = openBrain('sqlite::memory:');
await forget();
for (const s of ['x is my friend', 'and she is my close friend']) {
  const r = await brain(s, { from: 29 });
  console.log(`${s.padEnd(28)} [${r.expression?.name}] ${r.expression?.state?.says ?? ''}`);
}
console.log(serialize());
