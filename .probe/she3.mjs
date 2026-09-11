import { openBrain } from '../src/index.js';
const { brain, forget, serialize } = openBrain('sqlite::memory:');
await forget();
for (const s of ['x is my friend', 'she is white', 'what is x?']) {
  const r = await brain(s, { from: 29 });
  console.log(`${s.padEnd(20)} [${r.expression?.name}] ${r.expression?.state?.says ?? ''}`);
}
console.log(serialize().split('actions')[0]);
