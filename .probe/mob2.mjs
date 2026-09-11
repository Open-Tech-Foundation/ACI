import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
const dump = (n, i = 0) => {
  const st = n.state || {};
  const keys = Object.keys(st).filter((k) => st[k] != null);
  console.log('  '.repeat(i) + n.kind + ':' + n.name + (keys.length ? '  {' + keys.map((k) => k + '=' + JSON.stringify(st[k])).join(' ') + '}' : ''));
  (n.branch || []).forEach((b) => dump(b, i + 1));
};
for (const word of ['mobile', 'phone']) {
  await forget();
  console.log('\n===== ' + word);
  for (const s of [`i have one ${word}`, 'what is it?']) {
    const r = await brain(s, { from: 29 });
    console.log(`> ${s} => [${r.expression?.name}] ${r.expression?.state?.says ?? ''}  spoken=${JSON.stringify(r.spoken)} focus=${JSON.stringify(r.focus)}`);
    for (const root of r.phases.judge) dump(root);
  }
}
