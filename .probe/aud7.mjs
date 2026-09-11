import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
await forget();
for (const s of ['veena is a person','veena has 1 book','does veena have many books?']) {
  const r = await brain(s); console.log(`  ${s}\n     -> [${r.expression?.name}] ${r.expression?.state?.says ?? ''}`);
}
