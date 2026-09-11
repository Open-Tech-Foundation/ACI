import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
for (const s of ['how many days are there in a week?', 'there are seven days in a week', 'how many days are in a week?', 'a week has how many days?', 'there is a cup on the table', 'how many cups are there?']) {
  await forget();
  await brain('a week has seven days', { from: 29 });
  const r = await brain(s, { from: 29 });
  console.log(`${s.padEnd(36)} ${r.expression?.state?.says ?? r.expression?.name}`);
}
