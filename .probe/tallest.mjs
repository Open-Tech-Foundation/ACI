import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
const run = async (label, lines) => {
  await forget(); console.log('\n== ' + label);
  for (const s of lines) {
    const r = await brain(s, { from: 29 });
    console.log(`> ${s}\n   [${r.expression?.name}] ${r.expression?.state?.says ?? ''}`);
  }
};
await run('one line', ['x is my friend, and she is taller than me, Y is friend of x, and he is taller x, who is the tallest?']);
await run('apart, tidied', ['x is my friend', 'she is taller than me', 'y is a friend of x', 'he is taller than x', 'who is the tallest?']);
await run('names only', ['x is taller than me', 'y is taller than x', 'who is the tallest?']);
