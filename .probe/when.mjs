import { openBrain } from '../src/index.js';
const { brain, forget, serialize } = openBrain('sqlite::memory:');
await forget();
for (const s of ['nila arrived yesterday', 'when did nila arrive?', 'did nila arrive yesterday?']) {
  const r = await brain(s, { from: 29 });
  console.log(`${s.padEnd(30)} ${r.expression?.state?.says ?? r.expression?.name}`);
}
console.log(serialize().split('rules')[0].split('facts')[1]);
