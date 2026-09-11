import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
for (const [a, b] of [['nila arrived', 'when did nila arrive?'], ['nila kicked the ball', 'when did nila kick the ball?'], ['nila arrived yesterday', 'what did nila arrive?']]) {
  await forget();
  await brain(a, { from: 29 });
  const r = await brain(b, { from: 29 });
  console.log(`${a.padEnd(24)} ${b.padEnd(30)} ${r.expression?.state?.says ?? r.expression?.name}`);
}
