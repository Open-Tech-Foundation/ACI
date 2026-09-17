import { openBrain } from './src/index.js';
const CASES = [
  ['ravi has a red ball', 'kumar has a blue ball', 'who has the red ball?'],
  ['ravi has a red ball', 'kumar has a blue ball', 'who has the blue ball?'],
  ['ravi has a red ball', 'does ravi have a ball?'],
  ['ravi has a ball', 'does ravi have a ball?'],
  ['meera has 3 ropes', 'how many ropes does meera have?'],
  ['a shelf has 5 books and 8 files', 'how many things does the shelf have?'],
];
for (const lines of CASES) {
  const { brain } = openBrain('sqlite::memory:');
  let last;
  for (const l of lines) last = (await brain(l)).expression;
  console.log(`  ${lines[lines.length-1].padEnd(38)} ${last?.name} :: ${last?.state?.says ?? ''}`);
}
