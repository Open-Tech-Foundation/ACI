import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
const run = async (...lines) => {
  await forget(); console.log('--');
  for (const s of lines) {
    const r = await brain(s, { from: 29 });
    console.log(`  ${s.padEnd(46)} [${r.expression?.name}] ${r.expression?.state?.says ?? ''}`);
  }
};
await run('in my pond, there is a frog called fg and that can fly');
await run('fg is a frog', 'fg can fly', 'can fg fly?');
await run('fg is a frog', 'fg flies', 'does fg fly?');
await run('a frog called fg is in my pond', 'where is fg?');
