import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
for (const s of ['an hour has how many minutes?', 'a day has how many hours?', 'a day has how many minutes?', 'a week has how many hours?', 'is an hour more than a minute?', 'how many seconds are in a day?']) {
  await forget();
  const r = await brain(s, { from: 29 });
  console.log(`${s.padEnd(34)} ${r.expression?.state?.says ?? r.expression?.name}`);
}
