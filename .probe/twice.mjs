import { openBrain } from '../src/index.js';
const { brain } = openBrain('sqlite::memory:');
for (const line of ['a shelf holds 4 stamps', 'a shelf holds 6 stamps']) {
  const a = await brain(line, { from: 29 });
  console.log(`> ${line}\n  ${a.expression?.state?.says}\n  ${JSON.stringify(a.learned)}`);
}
