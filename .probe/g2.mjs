import { openBrain } from '../src/index.js';
for (const run of [
  ['tom is taller than sam','sam is taller than john','who is the tallest?'],
  ['sara arrived before john','john arrived before mike','who arrived first?'],
  ['sara arrived before john','john arrived before mike','who is first?'],
  ['sara arrived before john','john arrived before mike','who arrived before john?'],
  ['sara arrived before john','john arrived before mike','who arrived earliest?'],
]) {
  const b = openBrain('sqlite::memory:');
  let last;
  for (const s of run) last = await b.brain(s);
  console.log(JSON.stringify(run[run.length-1]), '=>', last.expression?.state?.says);
}
