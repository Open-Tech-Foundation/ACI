import { openBrain } from '../src/index.js';
const { brain, forget, serialize } = openBrain('sqlite::memory:');
const [ ...lines ] = (await import('runtime:process')).args;
await forget();
for (const s of lines) {
  const r = await brain(s, { from: 29 });
  console.log(`\n> ${s}\n  [${r.expression?.name}] ${r.expression?.state?.says ?? ''}`);
}
console.log(serialize());
