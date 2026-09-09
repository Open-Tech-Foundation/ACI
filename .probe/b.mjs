import { openBrain } from '../src/index.js';
const { brain } = openBrain('sqlite::memory:');
const gather = (r, k, f=[]) => { for (const n of r||[]) { if (n.kind===k) f.push(n); gather(n.branch,k,f);} return f; };
const r = await brain('the red box is inside the blue box');
const walk = (n, d=0) => {
  const t = n.state?.thought;
  if (n.kind === 'thing') console.log('  '.repeat(d) + 'thing:' + n.name, '| concept:', t?.concept, '| marks:', t?.marks);
  if (['call','learn','standing'].includes(n.kind)) console.log('  '.repeat(d) + n.kind + ':' + n.name, JSON.stringify(n.state));
  for (const b of n.branch || []) walk(b, d+1);
};
for (const root of r.phases.judge) walk(root);
