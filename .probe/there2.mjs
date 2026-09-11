import { openBrain } from '../src/index.js';
const { brain, forget, serialize } = openBrain('sqlite::memory:');
await forget();
const a = await brain('there are seven days in a week', { from: 29 });
console.log('learned:', JSON.stringify(a.learned));
console.log(serialize().split('actions')[0]);
for (const s of ['how many days are there in a week?', 'how many days does a week have?']) {
  const r = await brain(s, { from: 29 });
  console.log(`${s.padEnd(36)} ${r.expression?.state?.says ?? r.expression?.name}`);
}
