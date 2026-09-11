globalThis.BDBG = 1;
import { openBrain } from '../src/index.js';
const P = { from: 29 };
const b = openBrain('sqlite::memory:');
await b.brain('i have two dogs', P);
await b.brain('both are white', P);
