import { openBrain } from '../src/index.js';
const groups = {
  modality: [
    ['a sparrow can fly', 'can a sparrow fly?'],
    ['a stone cannot fly', 'can a stone fly?'],
    ['it is possible that ravi is late', 'is ravi late?'],
    ['every person must breathe', 'must ravi breathe?'],
  ],
  rules: [
    ['if a plant gets no water then the plant is dry', 'the fern gets no water', 'is the fern dry?'],
    ['every bird has feathers', 'a robin is a bird', 'does a robin have feathers?'],
  ],
  belief: [
    ['ravi knows that the shop is open', 'does ravi know the shop is open?', 'is the shop open?'],
    ['meera believes the train is late', 'is the train late?', 'what does meera believe?'],
  ],
  duration: [
    ['the meeting lasted two hours', 'how long did the meeting last?'],
    ['the film starts at six', 'when does the film start?'],
    ['ravi walked while meera cooked', 'did ravi walk while meera cooked?'],
  ],
  parts: [
    ['a spoke is a part of a wheel', 'a wheel is a part of a bicycle', 'is a spoke a part of a bicycle?', 'is a spoke a direct part of a bicycle?'],
    ['a bell is made of brass', 'is a bell brass?'],
  ],
  quantity: [
    ['a hand has five fingers', 'how many fingers does a hand have?'],
    ['ravi has many books', 'does ravi have many books?'],
    ['a bridge is two hundred metres long', 'how long is the bridge?'],
  ],
  disjunction: [
    ['the key is in the drawer or on the shelf', 'where is the key?'],
    ['meera is either at home or at work', 'is meera at home?'],
  ],
};
const { brain } = openBrain('sqlite::memory:');
for (const [name, lines] of Object.entries(groups)) {
  console.log('\n### ' + name);
  for (const s of lines) {
    let r;
    try { r = await brain(s); } catch (e) { console.log(`  ${s}\n    !! ${e.message}`); continue; }
    console.log(`  ${s}\n    -> ${r.expression?.state?.says ?? r.expression?.name ?? JSON.stringify(r.expression)}`);
  }
}
