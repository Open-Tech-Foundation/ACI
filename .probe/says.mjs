import { openBrain } from '../src/index.js';
const { brain } = openBrain('sqlite::memory:');
const { args } = await import('runtime:process');
for (const line of args) {
  const a = await brain(line, { from: 29 });
  console.log(`> ${line}\n  ${a.expression?.state?.says ?? a.expression?.name ?? '(nothing)'}`);
}
