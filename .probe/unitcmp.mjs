import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
for (const s of ['is an hour more than a minute?', 'is a minute more than an hour?', 'which is more, an hour or a minute?', 'is a kilogram more than a gram?', 'is an hour longer than a minute?']) {
  await forget();
  const r = await brain(s, { from: 29 });
  console.log(`${s.padEnd(38)} ${r.expression?.state?.says ?? r.expression?.name}`);
}
