import { openBrain } from '../src/index.js';
const { brain, forget, graph } = openBrain('sqlite::memory:');
await forget();
await brain('Hi', { from: 29 });
console.log(JSON.stringify(graph(), null, 2));
