import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
await forget();
for (const s of ['i kicked a ball', 'i kicked a ball', 'how many times did i kick?', 'did i kick a ball?', 'how many times did i greet you?']) {
  const r = await brain(s, { from: 29 });
  console.log(`> ${s}\n   [${r.expression?.name}] ${r.expression?.state?.says ?? ''}`);
}
