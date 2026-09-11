import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
const run = async (...lines) => {
  await forget(); console.log('--');
  for (const s of lines) {
    const r = await brain(s, { from: 29 });
    console.log(`  ${s.padEnd(30)} [${r.expression?.name}] ${r.expression?.state?.says ?? ''}`);
  }
};
await run('x is my friend', 'she is my close friend');
await run('x is my friend', 'she is my friend');
await run('x is my friend', 'it is my friend');
await run('x is my friend', 'and it is my friend');
await run('nila is a cat', 'she is white');
