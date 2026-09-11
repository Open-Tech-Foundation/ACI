import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
await forget();
for (const s of ['apple is a fruit', 'apple is a fruit and put one into a basket', 'where is the apple now?', 'where is it?']) {
  const r = await brain(s, { from: 29 });
  console.log(`> ${s}\n   [${r.expression?.name}] ${r.expression?.state?.says ?? ''}  learned=${JSON.stringify(r.learned)?.slice(0,200)}`);
}
console.log('---- said on its own');
await forget();
for (const s of ['i put one apple into a basket', 'where is the apple now?']) {
  const r = await brain(s, { from: 29 });
  console.log(`> ${s}\n   [${r.expression?.name}] ${r.expression?.state?.says ?? ''}`);
}
