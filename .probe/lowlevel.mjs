import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
const cases = [
  ['classification: up one', ['is a wren a bird?'], 'affirm'],
  ['classification: up two', ['is a wren an animal?'], 'affirm'],
  ['classification: down', ['is a bird a wren?'], 'unsure'],
  ['classification: sideways, declared apart', ['is a wren a fish?'], 'deny'],
  ['classification: sideways, not declared', ['is water a solid?'], 'deny'],
  ['classification: learned, then up', ['tilly is a heron', 'is tilly an animal?'], 'affirm'],
  ['identity: a thing is itself', ['is a wren a wren?'], 'affirm'],
  ['identity: different', ['is a wren different from a fish?'], 'affirm'],
  ['negation: told not', ['a wren is not a fish', 'is a wren a fish?'], 'deny'],
  ['negation: denial is knowledge', ['a bell is not red', 'is a bell red?'], 'deny'],
  ['counting: told and asked', ['a shelf holds 4 stamps', 'how many stamps does the shelf hold?'], 'answer'],
  ['counting: none', ['how many stamps does the shelf hold?'], 'unsure'],
  ['arithmetic: sum', ['what is 2 plus 3?'], 'answer'],
  ['arithmetic: compare', ['is 3 more than 2?'], 'affirm'],
  ['relation: converse', ['tom is the father of sam', 'is sam the son of tom?'], 'affirm'],
  ['relation: transitive', ['a is part of b', 'b is part of c', 'is a part of c?'], 'affirm'],
  ['relation: symmetric', ['mira is the sister of nila', 'is nila the sister of mira?'], 'affirm'],
  ['relation: irreflexive', ['is a wren part of a wren?'], 'deny'],
  ['property: told and asked', ['a bell is red', 'is a bell red?'], 'affirm'],
  ['property: one state at a time', ['a bell is red', 'a bell is blue', 'is a bell red?'], 'deny'],
  ['existence: the root', ['is a wren an existence?'], 'affirm'],
];
let ok = 0;
for (const [name, lines, want] of cases) {
  await forget();
  let last;
  for (const l of lines) last = await brain(l, { from: 29 });
  const got = last.expression?.name;
  const pass = got === want;
  if (pass) ok += 1;
  console.log(`${pass ? '  ' : '!!'} ${name.padEnd(38)} want ${String(want).padEnd(7)} got ${got}`);
}
console.log(`\n${ok}/${cases.length}`);
