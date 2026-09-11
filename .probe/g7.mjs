import { openBrain } from '../src/index.js';
const b = openBrain('sqlite::memory:');
await b.brain('sara arrived before john');
await b.brain('john arrived before mike');
const r = await b.brain('who arrived first?');
const walk = (n, d = 0) => { if (['thing','sentence','answer','standing','refuse','learn','clause','verbComplement'].includes(n.kind)) console.log('  '.repeat(d) + n.kind + ':' + (n.name ?? '') + ':' + (n.state?.identity ?? '') + (n.kind==='answer'?JSON.stringify(n.state):'')); (n.branch||[]).forEach((x)=>walk(x,d+1)); };
r.roots.forEach((n) => walk(n));
