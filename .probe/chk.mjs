import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
await forget();
for (const s of ['a crow is bigger than a wren', 'which is bigger, a crow or a wren?', 'who kicked the ball?']) {
  const r = await brain(s, { from: 29 });
  console.log(`${s.padEnd(38)} [${r.expression?.name}] ${r.expression?.state?.says ?? ''}`);
}
