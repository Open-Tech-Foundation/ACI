import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
for (const s of ['the cow measures 2 metre big', 'the cow measures 2 metre long', 'tom measures 5 second']) {
  await forget();
  const r = await brain(s);
  console.log(s.padEnd(34), '=>', r.expression?.state?.says ?? r.expression?.name);
}
