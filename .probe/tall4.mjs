import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
const run = async (label, lines) => {
  await forget(); console.log('== ' + label);
  for (const s of lines) {
    const r = await brain(s, { from: 29 });
    console.log(`  ${s}\n     [${r.expression?.name}] ${r.expression?.state?.says ?? ''} learned=${r.learned ? r.learned.terms.length + ' terms' : 'null'}`);
  }
};
await run('names, no me', ['nila is taller than ravi', 'ravi is taller than kabir', 'who is the tallest?']);
await run('names with me', ['nila is taller than me', 'ravi is taller than nila', 'who is the tallest?']);
await run('x and y', ['nila is taller than ravi', 'x is taller than nila', 'who is the tallest?']);
