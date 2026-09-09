import { openBrain } from '../src/index.js';
const { brain } = openBrain('sqlite::memory:');
await brain('tom is taller than sam');
await brain('sam is taller than john');
for (const q of ['who is the tallest?','who is the shortest?','who is taller than sam?','who is shorter than sam?','is tom taller than john?','is john taller than tom?']) {
  console.log(q.padEnd(28), '=>', (await brain(q)).expression?.state?.says ?? '');
}
