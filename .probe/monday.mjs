import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
for (const s of ['is monday before tuesday?', 'what comes after monday?', 'is monday before wednesday?', 'monday is before tuesday', 'is tuesday after monday?']) {
  await forget();
  const r = await brain(s, { from: 29 });
  console.log(`${s.padEnd(30)} ${r.expression?.state?.says ?? r.expression?.name}`);
}
