globalThis.YDBG = 1;
import { openBrain } from '../src/index.js';
const P = { from: 29 };
const b = openBrain('sqlite::memory:');
await b.brain('a drum is cold because a drum is wet', P);
console.log('=>', (await b.brain('why is a drum cold?', P)).expression?.state?.says);
