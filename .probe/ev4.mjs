import { openBrain } from '../src/index.js';
const b = openBrain('sqlite::memory:');
for (const s of ['a tree fell', 'a tree fell on the road']) {
  const r = await b.brain(s);
  const walk = (n, d = 0) => { if (!n) return; console.log('  '.repeat(d) + n.kind + ' ' + (n.name ?? '')); (n.branch||[]).forEach(c => walk(c, d+1)); };
  console.log('>', s); (Array.isArray(r.roots) ? r.roots : [r]).forEach(n => walk(n));
  console.log(Object.keys(r));
}
