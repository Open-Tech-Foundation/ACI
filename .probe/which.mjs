import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
for (const s of ['which is larger 45 or 54?', 'which is larger, 45 or 54?', 'which is smaller, 45 or 54?', 'which is bigger, 145 or 54?', 'which is smaller, 8 or 0?']) {
  await forget();
  const r = await brain(s, { from: 29 });
  console.log(`${s.padEnd(32)} ${r.expression?.state?.says ?? r.expression?.name}`);
}
