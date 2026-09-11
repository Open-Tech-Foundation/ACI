import { openBrain } from '../src/index.js';
import { graph } from '../src/graph.js';
const { brain } = openBrain('sqlite::memory:');
const r = await brain('the dog is called river');
console.log('says:', r.expression?.state?.says ?? r.expression?.name);
console.log('learned:', JSON.stringify(r.learned));
console.log('context names:', JSON.stringify(graph().context));
