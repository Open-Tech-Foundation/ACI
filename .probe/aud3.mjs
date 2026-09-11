import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
const runs = {
  measure: [
    'the rope is 2 metres long',
    'how long is the rope?',
    'is the rope 2 metres long?',
    'the rope weighs 3 kilograms',
    'how heavy is the rope?',
    'how many grams does the rope weigh?',
  ],
  manyfew: [
    'veena is a person',
    'veena has 20 books',
    'does veena have many books?',
    'veena has 1 book',
    'does veena have few books?',
  ],
  propositions: [
    'the door is open',
    'why is the door open?',
    'the door is open because the wind is strong',
    'why is the door open?',
    'do i know the door is open?',
  ],
  time: [
    'nita is a person',
    'nita left before the rain started',
    'did nita leave before the rain started?',
    'what happened first?',
  ],
};
for (const [name, lines] of Object.entries(runs)) {
  await forget();
  console.log('\n### ' + name);
  for (const s of lines) {
    let r; try { r = await brain(s); } catch (e) { console.log(`  ${s}\n     !! ${e.message}`); continue; }
    console.log(`  ${s}\n     -> [${r.expression?.name}] ${r.expression?.state?.says ?? ''}`);
  }
}
