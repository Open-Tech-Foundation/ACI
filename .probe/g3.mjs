import { openBrain } from '../src/index.js';
for (const run of [
  ['sara is before john','john is before mike','who is the first?'],
  ['sara is before john','john is before mike','who is first?'],
  ['sara is before john','john is before mike','who is before john?'],
  ['tom is taller than sam','sam is taller than john','who is taller than john?'],
]) {
  const b = openBrain('sqlite::memory:');
  let last;
  for (const s of run) last = await b.brain(s);
  console.log(JSON.stringify(run.join(' | ')), '=>', last.expression?.state?.says);
}
