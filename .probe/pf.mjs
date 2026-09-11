import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const s of ['anu washed the cup','tom sees a bird','the apple is company','sara arrived before john','tom gave a book to sam','the sky turns red']) {
  const b = openBrain('sqlite::memory:');
  await b.brain(s, P);
  const g = b.graph();
  for (const f of g.facts) console.log(JSON.stringify(s), 'fact of:', f.of);
  for (const a of g.actions) console.log(JSON.stringify(s), 'action of:', a.of, 'said:', a.said);
}
