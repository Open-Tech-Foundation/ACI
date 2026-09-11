import { openBrain } from '../src/index.js';
const P = { from: 29 };
const b = openBrain('sqlite::memory:');
const r1 = await b.brain('i have two dogs', P);
console.log('after signal 1');
console.log('  graph focus:', JSON.stringify(b.graph().context));
console.log('  handed back:', JSON.stringify(r1.focus), 'spoken:', JSON.stringify(r1.spoken));
