import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
await forget();
for (const s of ['i have one mobile','i have what?','what is it?','what is mobile?','is a mobile a toy?','is a mobile a phone?','what is a phone?','i have one phone','what is it?']) {
  const r = await brain(s, { from: 29 });
  console.log(`  ${s}\n     -> [${r.expression?.name}] ${r.expression?.state?.says ?? ''}`);
}
