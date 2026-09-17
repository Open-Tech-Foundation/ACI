import { openBrain } from './src/index.js';
const CASES = [
  [['the door is closed', 'ravi opened the door'], 'why is the door open?'],
  [['the door is closed', 'ravi opened the door'], 'is the door open?'],
  [['the door is open because the wind is strong'], 'why is the door open?'],
  [['the coffee is hot', 'the coffee got cold'], 'why is the coffee cold?'],
  [[], 'why is the lamp broken?'],
];
for (const [told, q] of CASES) {
  const { brain } = openBrain('sqlite::memory:');
  for (const t of told) await brain(t);
  const a = await brain(q);
  console.log(`  ${told.join(' / ').slice(0,38).padEnd(40)} ${q.padEnd(26)} ${a.expression?.name} :: ${a.expression?.state?.says ?? ''}`);
}
