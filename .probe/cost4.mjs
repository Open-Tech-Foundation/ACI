import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
await brain('a drum is cold');
let t = performance.now();
for (let i = 0; i < 10; i += 1) await forget();
console.log(`forget          ${((performance.now() - t) / 10).toFixed(0)} ms each`);
t = performance.now();
for (let i = 0; i < 10; i += 1) { await forget(); await brain('a drum is cold'); }
console.log(`forget + learn  ${((performance.now() - t) / 10).toFixed(0)} ms each`);
