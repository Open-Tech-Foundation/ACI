import { openBrain } from '../src/index.js';
for (let i = 0; i < 3; i += 1) {
  const t = performance.now();
  const { brain } = openBrain('sqlite::memory:');
  await brain('a drum is cold');
  console.log(`brain ${i + 1}  ${(performance.now() - t).toFixed(0)} ms`);
}
