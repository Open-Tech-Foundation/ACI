import { openBrain } from '../src/index.js';
const { brain, forget, graph } = openBrain('sqlite::memory:');
await forget();
await brain('x is my friend', { from: 29 });
const r = await brain('she is white', { from: 29 });
console.log('learned:', JSON.stringify(r.learned));
console.log(JSON.stringify(graph().facts, null, 1));
console.log(JSON.stringify(graph().nodes, null, 1));
