import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
await forget();
for (const s of ['nila arrived yesterday', 'did nila arrive?', 'who arrived?', 'when did nila arrive?', 'when arrived nila?']) {
  const r = await brain(s, { from: 29 });
  console.log(`${s.padEnd(26)} ${r.expression?.state?.says ?? r.expression?.name}`);
}
