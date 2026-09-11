globalThis.EDBG = 1;
import { openBrain } from '../src/index.js';
const b = openBrain('sqlite::memory:');
await b.brain('sara arrived before john');
await b.brain('john arrived before mike');
console.log('=>', (await b.brain('who arrived first?')).expression?.state?.says);
