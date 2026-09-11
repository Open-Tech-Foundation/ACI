import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
for (const s of ['a week has how many days?', 'how many days in a week?', 'how many days does a week have?', 'how many hours in a day?', 'how many minutes in a day?']) {
  await forget();
  const r = await brain(s, { from: 29 });
  console.log(`${s.padEnd(34)} ${r.expression?.state?.says ?? r.expression?.name}`);
}
