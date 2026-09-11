import { openBrain } from '../src/index.js';
const b = openBrain('sqlite::memory:');
const r = await b.brain('a road became wet because a plank fell');
const all = []; const walk = (n) => { if (!n) return; all.push(n); (n.branch||[]).forEach(walk); };
r.roots.forEach(walk);
for (const n of all) if (n.kind === 'standing' || n.kind === 'call') console.log(n.kind, n.name, JSON.stringify(n.state));
