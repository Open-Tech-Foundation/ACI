import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
const run = async (...lines) => {
  await forget();
  for (const s of lines) {
    const r = await brain(s, { from: 29 });
    console.log(`  ${s.padEnd(28)} ${r.expression?.state?.says ?? r.expression?.name}`);
  }
};
await run('nila kicked the ball', 'who kicked the ball?', 'what did nila kick?');
await run('the cup is on the table', 'where is the cup?', 'what is on the table?');
await run('nila arrived yesterday', 'when did nila arrive?');
await run('nila is a teacher', 'who is nila?');
await run('nila is my friend', 'who is my friend?');
