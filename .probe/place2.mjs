import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
const dump = (n, i = 0) => {
  const st = n.state || {};
  const keys = Object.keys(st).filter((k) => st[k] != null && k !== 'thought');
  console.log('  '.repeat(i) + n.kind + ':' + n.name + (keys.length ? '  {' + keys.map((k) => k + '=' + JSON.stringify(st[k])).join(' ') + '}' : ''));
  (n.branch || []).forEach((b) => dump(b, i + 1));
};
await forget();
const a = await brain('the cup is on the table', { from: 29 });
for (const root of a.phases.judge) dump(root);
console.log('====');
const r = await brain('where is the cup?', { from: 29 });
for (const root of r.phases.judge) dump(root);
