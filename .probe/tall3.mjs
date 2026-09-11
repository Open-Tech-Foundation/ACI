import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
await forget();
for (const s of ['x is taller than me', 'y is taller than x', 'who is the tallest?', 'is y taller than me?']) {
  const r = await brain(s, { from: 29 });
  console.log(`> ${s}\n   [${r.expression?.name}] ${r.expression?.state?.says ?? ''}\n   learned=${JSON.stringify(r.learned)}`);
}
