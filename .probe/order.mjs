import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
for (const s of ['is monday before tuesday?', 'is tuesday before monday?', 'is tuesday after monday?', 'is monday before wednesday?', 'is january before march?', 'is march before january?']) {
  await forget();
  const r = await brain(s, { from: 29 });
  console.log(`${s.padEnd(30)} ${r.expression?.state?.says ?? r.expression?.name}`);
}
