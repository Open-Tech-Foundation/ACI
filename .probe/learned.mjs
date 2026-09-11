import { openBrain } from '../src/index.js';
const { brain } = openBrain('sqlite::memory:');
const { args } = await import('runtime:process');
for (const line of args) {
  const a = await brain(line);
  console.log(`> ${line}\n  ${a.expression?.state?.says ?? a.expression?.name}`);
  console.log('  learned:', JSON.stringify(a.learned));
}
