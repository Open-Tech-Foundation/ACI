import { openBrain } from '../src/index.js';
const P = { from: 29 };
const b = openBrain('sqlite::memory:');
for (const s of ['a bird flies','a penguin is a bird','a penguin does not fly']) {
  const r = await b.brain(s, P);
  console.log(JSON.stringify(s), '=>', r.expression?.state?.says, '|', JSON.stringify(r.learned));
}
