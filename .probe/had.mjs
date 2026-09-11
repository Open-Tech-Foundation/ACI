import { openBrain } from '../src/index.js';
const { brain, forget, serialize } = openBrain('sqlite::memory:');
await forget();
for (const s of ['nila has five books', 'nila had three books', 'how many books does nila have?', 'how many books did nila have?']) {
  const r = await brain(s, { from: 29 });
  console.log(`${s.padEnd(34)} ${r.expression?.state?.says ?? r.expression?.name}`);
}
console.log(serialize().split('actions')[0]);
