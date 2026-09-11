import { openBrain } from '../src/index.js';
const t0 = Date.now();
const { brain } = openBrain('sqlite::memory:');
await brain('hi');
console.log('open + first signal:', Date.now() - t0, 'ms');
