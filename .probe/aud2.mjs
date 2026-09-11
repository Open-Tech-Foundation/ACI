import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
const runs = {
  modality: [
    ['nila is a bird'],
    ['nila can fly'],
    ['can nila fly?'],
    ['must nila fly?'],
    ['nila may fly'],
    ['it is possible that nila flies'],
  ],
  rules: [
    ['kabir is a plant'],
    ['if a plant has no water then the plant is dry'],
    ['kabir has no water'],
    ['is kabir dry?'],
  ],
  everyRule: [
    ['every bird has feathers'],
    ['nila is a bird'],
    ['does nila have feathers?'],
  ],
  belief: [
    ['tara is a teacher'],
    ['tara knows the river is long'],
    ['does tara know the river is long?'],
    ['is the river long?'],
    ['tara believes the river is short'],
    ['what does tara believe?'],
  ],
  duration: [
    ['the meeting is an event'],
    ['the meeting took two hours'],
    ['how long was the meeting?'],
  ],
  parts: [
    ['a spoke is part of a wheel'],
    ['a wheel is part of a bicycle'],
    ['is a spoke part of a bicycle?'],
    ['how many spokes does a wheel have?'],
  ],
  material: [
    ['a bell is made of brass'],
    ['is a bell brass?'],
    ['what is a bell made of?'],
  ],
  quantity: [
    ['a hand has five fingers'],
    ['how many fingers does a hand have?'],
    ['veena is a person'],
    ['veena has many books'],
    ['does veena have many books?'],
  ],
  disjunction: [
    ['the key is in the drawer or on the shelf'],
    ['where is the key?'],
  ],
  units: [
    ['the rope is 2 metres long'],
    ['how long is the rope?'],
    ['2 metres is how many centimetres?'],
  ],
};
for (const [name, lines] of Object.entries(runs)) {
  await forget();
  console.log('\n### ' + name);
  for (const [s] of lines) {
    let r;
    try { r = await brain(s); } catch (e) { console.log(`  ${s}\n     !! ${e.message}`); continue; }
    console.log(`  ${s}\n     -> [${r.expression?.name}] ${r.expression?.state?.says ?? ''}`);
  }
}
