import { openBrain } from '../src/index.js';
const { brain, forget, serialize } = openBrain('sqlite::memory:');
for (const who of ['nila', 'x']) {
  await forget();
  const r = await brain(`${who} is my friend`, { from: 29 });
  console.log(`\n== ${who}: [${r.expression?.name}] learned=${JSON.stringify(r.learned)?.slice(0,200)}`);
  console.log(serialize().split('actions')[0]);
}
