globalThis.ACI_DEBUG = 1;
import { openBrain } from '../src/index.js';
const { brain } = openBrain('sqlite::memory:');
const { args } = await import('runtime:process');
for (const line of args) {
  console.log(`\n> ${line}`);
  const a = await brain(line, { from: 29 });
  console.log(`  ${a.expression?.state?.says ?? a.expression?.name}`);
}
