import { openBrain } from '../src/index.js';
const { brain } = openBrain('sqlite::memory:');
const { args } = await import('runtime:process');
const show = (n, d = 0) => {
  if (['standing','learn','answer','count','refuse','event','instruction','call','named','sum','did','cause','about'].includes(n.kind)) {
    console.log('  '.repeat(d) + `${n.kind}:${n.name} ${JSON.stringify(n.state)}`.slice(0, 180));
  }
  for (const b of n.branch || []) show(b, d + 1);
};
for (const line of args) {
  const a = await brain(line, { from: 29 });
  console.log(`\n> ${line}  => ${a.expression?.state?.says}  learned=${a.learned ? a.learned.terms.length : 'null'}`);
  for (const r of a.roots || []) show(r);
}
