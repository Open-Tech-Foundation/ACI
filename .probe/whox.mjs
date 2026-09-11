import { openBrain } from '../src/index.js';
const { brain, forget, serialize } = openBrain('sqlite::memory:');
await forget();
for (const s of ['x is my friend', 'who is x?', 'what is x?', 'is x my friend?', 'who is my friend?']) {
  const r = await brain(s, { from: 29 });
  console.log(`${s.padEnd(22)} [${r.expression?.name}] ${r.expression?.state?.says ?? ''}`);
}
console.log(serialize());
