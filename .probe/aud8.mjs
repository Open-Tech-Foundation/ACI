import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
await forget();
for (const s of ['z is 3','if z > 10 then say wool else silk','if z > 10 then wool else silk','if 15 > 10 then say wool else say silk','if x > 10, then say big else say small']) {
  const r = await brain(s); console.log(`  ${s}\n     -> [${r.expression?.name}] ${r.expression?.state?.says ?? ''}`);
}
