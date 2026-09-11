import { openBrain } from '../src/index.js';
const P = { from: 29 };
const runs = [
  ['a bird is warm','a penguin is a bird','a penguin is not warm','luna is a penguin','luna is warm?'],
  ['a bird is warm','a penguin is a bird','a penguin is warm?'],
  ['a cat is warm?'],
  ['a cat is an animal?'],
  ['a bird is warm','a penguin is a bird','a penguin is not warm','a crow is a bird','a crow is warm?'],
];
for (const run of runs) {
  const b = openBrain('sqlite::memory:');
  let last;
  for (const s of run) last = await b.brain(s, P);
  console.log(JSON.stringify(run[run.length-1]), '=>', last.expression?.state?.says);
}
