globalThis.JDBG = 1;
import { openBrain } from '../src/index.js';
const { brain } = openBrain('sqlite::memory:');
await brain('a drum is red or a drum is blue', { from: 29 });
