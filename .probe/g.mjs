import { openBrain } from '../src/index.js';
const { brain, graph } = openBrain('sqlite::memory:');
await brain('if a drum is cold then a bell is red');
await brain('the drum is cold');
console.log(JSON.stringify(graph().nodes, null, 1));
