import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
const dump = (n, i = 0) => {
  const pad = '  '.repeat(i);
  const st = n.state || {};
  const keys = Object.keys(st).filter((k) => st[k] != null && typeof st[k] !== 'object');
  const bits = keys.map((k) => `${k}=${JSON.stringify(st[k])}`).join(' ');
  console.log(`${pad}${n.kind}:${n.name}${bits ? '  {' + bits + '}' : ''}`);
  (n.branch || []).forEach((b) => dump(b, i + 1));
};
const [phase, ...args] = (await import('runtime:process')).args;
for (const s of args) {
  await forget();
  const r = await brain(s, { from: 29 });
  console.log(`\n> ${s}   => [${r.expression?.name}]`);
  for (const root of r.phases[phase]) dump(root);
}
