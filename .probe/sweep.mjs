import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
const sets = {
  'saying what a thing is': ['a crow is a bird', 'nila is a teacher', 'the sky is blue', 'a wren is not a fish'],
  'having and counting': ['ravi has three books', 'how many books does ravi have?', 'a hand has five fingers', 'ravi has no books'],
  'where things are': ['the cup is on the table', 'where is the cup?', 'the key is in the drawer', 'is the cup under the table?'],
  'doing': ['nila kicked the ball', 'who kicked the ball?', 'what did nila kick?', 'nila did not kick the ball'],
  'when': ['nila arrived yesterday', 'when did nila arrive?', 'nila will arrive tomorrow', 'nila is arriving now'],
  'asking': ['what is a crow?', 'who is nila?', 'why is the sky blue?', 'which is bigger, a crow or a wren?'],
  'comparing': ['a crow is bigger than a wren', 'is a wren smaller than a crow?', 'nila is as tall as ravi'],
  'joining': ['a crow is a bird and a wren is a bird', 'a crow is a bird but a bat is not', 'nila or ravi is a teacher'],
  'people': ['nila is my friend', 'who is my friend?', 'ravi is the father of nila', 'nila is taller than her father'],
  'numbers': ['what is 12 plus 30?', 'what is half of 10?', 'is 10 more than 2?', 'what is 7 times 8?'],
  'saying no': ['a crow is not a fish', 'nila does not have a book', 'nobody arrived', 'nothing is on the table'],
  'plurals and groups': ['crows are birds', 'all crows are black', 'some crows are white', 'two crows are on the tree'],
};
for (const [name, lines] of Object.entries(sets)) {
  console.log('\n## ' + name);
  await forget();
  for (const s of lines) {
    let r; try { r = await brain(s, { from: 29 }); } catch (e) { console.log(`  !! ${s} — ${e.message}`); continue; }
    console.log(`  ${(r.expression?.name ?? '?').padEnd(10)} ${s.padEnd(42)} ${r.expression?.state?.says ?? ''}`);
  }
}
