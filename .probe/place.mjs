import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
const run = async (...lines) => {
  await forget(); console.log('--');
  for (const s of lines) {
    const r = await brain(s, { from: 29 });
    console.log(`  ${s.padEnd(34)} ${r.expression?.state?.says ?? r.expression?.name}`);
  }
};
await run('the dog is under the table', 'where is the dog?');
await run('the cup is on the table', 'where is the cup?');
await run('the key is in the drawer', 'where is the key?');
await run('i put one book into a basket', 'where is the book?');
