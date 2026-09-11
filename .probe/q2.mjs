import { openBrain } from '../src/index.js';
const P = { from: 29 };
const b = openBrain('sqlite::memory:');
const r = await b.brain('i have eight fruits and split them into three groups', P);
console.log(JSON.stringify(b.graph().actions, null, 1));
console.log('learned:', JSON.stringify(r.learned));
