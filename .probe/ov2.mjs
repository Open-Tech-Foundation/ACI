import { openBrain } from '../src/index.js';
const P = { from: 29 };
const runs = [
  ['a bird has a wing', 'a penguin is a bird', 'a penguin has a wing?'],
  ['a bird is in a nest', 'a penguin is a bird', 'a penguin is in a nest?'],
  ['a bird is taller than a fish', 'a penguin is a bird', 'a penguin is taller than a fish?'],
];
for (const run of runs) {
  const b = openBrain('sqlite::memory:');
  let out=[];
  for (const s of run) out.push(`${JSON.stringify(s)} => ${(await b.brain(s, P)).expression?.state?.says}`);
  console.log(out[out.length-1]);
}
