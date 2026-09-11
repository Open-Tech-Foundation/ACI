import { openBrain } from '../src/index.js';
const b = openBrain('sqlite::memory:');
const r = await b.brain('hema and arun spoke');
const find = (n) => n.kind === 'event' ? n : (n.branch||[]).map(find).find(Boolean);
console.log(JSON.stringify(find(r.roots[0])?.state?.parts, null, 1));
