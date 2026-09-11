import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
await forget();
for (const s of ['is a friend a relation?', 'nila is my friend', 'am i a friend of nila?', 'what is a friend?']) {
  const r = await brain(s, { from: 29 });
  console.log(`> ${s}\n   [${r.expression?.name}] ${r.expression?.state?.says ?? ''}`);
}
