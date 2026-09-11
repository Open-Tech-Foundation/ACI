import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
const dump = (n, i = 0) => {
  const st = n.state || {};
  const keys = Object.keys(st).filter((k) => st[k] != null && typeof st[k] !== 'object');
  console.log('  '.repeat(i) + n.kind + ':' + n.name + (keys.length ? '  {' + keys.map((k) => k + '=' + JSON.stringify(st[k])).join(' ') + '}' : ''));
  (n.branch || []).forEach((b) => dump(b, i + 1));
};
await forget();
await brain('z is 3');
const r = await brain('if z > 10 then wool else silk');
console.log('=>', r.expression?.name, r.expression?.state?.says);
for (const root of r.phases.solve) dump(root);
