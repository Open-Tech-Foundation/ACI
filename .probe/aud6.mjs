import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
const runs = [
  ['anu booked a flight to delhi','anu changed the destination to mumbai','what is the destination?'],
  ['a family has two sisters and one brother','how many sisters','how many brothers','how many brothers and sisters','how many humans'],
];
for (const lines of runs) {
  await forget(); console.log('---');
  for (const s of lines) { const r = await brain(s); console.log(`  ${s}\n     -> [${r.expression?.name}] ${r.expression?.state?.says ?? ''}`); }
}
