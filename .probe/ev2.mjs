import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
for (const q of ['how long is the meeting?', 'the meeting is how many hours?', 'the meeting measures how many hours?', 'how many hours does the meeting have?']) {
  await forget();
  await brain('the meeting lasted two hours', { from: 29 });
  const r = await brain(q, { from: 29 });
  console.log(`${q.padEnd(40)} ${r.expression?.state?.says ?? r.expression?.name}`);
}
