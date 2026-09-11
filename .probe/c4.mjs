import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const run of [
  ['if a drum is cold then a bell is red','if a bell is red then a cup is blue','if a cup is blue then a kite is green','a drum is cold','a kite is green?'],
  ['if a drum is cold then a bell is red','if a bell is red then a drum is cold','a drum is cold','a bell is red?'],
  ['if a bell is red then a cup is blue','if a drum is cold then a bell is red','a drum is cold','a cup is blue?'],
]) {
  const b = openBrain('sqlite::memory:');
  for (const s of run) console.log(JSON.stringify(s), '=>', (await b.brain(s, P)).expression?.state?.says);
  console.log('---');
}
