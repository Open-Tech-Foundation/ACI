import { openBrain } from '../src/index.js';
const P = { from: 29 };
const b = openBrain('sqlite::memory:');
await b.brain('a drum is cold because a drum is wet', P);
const r = await b.brain('why is a drum cold?', P);
const walk = (n, d = 0) => { console.log('  '.repeat(d) + n.kind + ':' + (n.name ?? '') + ':' + (n.state?.identity ?? '')); (n.branch||[]).forEach((b)=>walk(b,d+1)); };
r.roots.forEach((n) => walk(n));
