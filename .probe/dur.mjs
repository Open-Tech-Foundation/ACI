import { openBrain } from '../src/index.js';
const { brain, forget, serialize } = openBrain('sqlite::memory:');
await forget();
for (const s of ['the meeting took two hours', 'how long was the meeting?', 'how many hours was the meeting?']) {
  const r = await brain(s, { from: 29 });
  console.log(`${s.padEnd(34)} ${r.expression?.state?.says ?? r.expression?.name}`);
}
console.log(serialize().split('rules')[0]);
