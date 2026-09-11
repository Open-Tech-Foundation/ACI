import { openBrain } from '../src/index.js';
const { brain } = openBrain('sqlite::memory:');
const { args } = await import('runtime:process');
const show = (n, d = 0) => {
  const t = (n.branch || []).find((b) => b.kind === 'thought');
  const th = t && t.state.thought;
  const bits = th ? `concept=${th.concept} pos=${th.pos} marks=${th.marks} fns=${JSON.stringify(th.functions)}` : '';
  if (!['quality', 'language', 'response', 'express', 'thought', 'form', 'symbol'].includes(n.kind)) {
    console.log('  '.repeat(d) + `${n.kind}:${n.name} ${bits}`);
  }
  for (const b of n.branch || []) show(b, d + 1);
};
for (const line of args) {
  const a = await brain(line, { from: 29 });
  console.log(`\n> ${line}  => ${a.expression?.state?.says ?? a.expression?.name}`);
  for (const r of a.roots || []) show(r);
}
