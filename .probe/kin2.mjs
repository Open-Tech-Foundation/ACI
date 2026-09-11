import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
const dump = (n, i = 0) => {
  const st = n.state || {};
  const keys = Object.keys(st).filter((k) => st[k] != null && k !== 'thought');
  console.log('  '.repeat(i) + n.kind + ':' + n.name + (keys.length ? '  {' + keys.map((k) => k + '=' + JSON.stringify(st[k])).join(' ') + '}' : ''));
  (n.branch || []).forEach((b) => dump(b, i + 1));
};
await forget();
const r = await brain('nila is my friend', { from: 29 });
console.log(`[${r.expression?.name}] ${r.expression?.state?.says}`);
for (const root of r.phases.judge) dump(root);
