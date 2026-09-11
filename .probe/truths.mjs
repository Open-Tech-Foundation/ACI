import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
const truths = [
  'a cup is a container', 'a bottle is a container', 'a bucket is a container', 'a bag is a container',
  'a jar is a container', 'a box is a container', 'a basket is a container',
  'a hammer is a tool', 'a saw is a tool', 'a spoon is a tool',
  'a car is a vehicle', 'a boat is a vehicle', 'a bicycle is a vehicle',
  'a chair is furniture', 'a bed is furniture',
  'a shirt is clothing', 'a hat is clothing',
  'a dog is an animal', 'a wren is a bird', 'a rose is a plant',
  'a hand is a body part', 'an eye is a body part',
  'a phone is a device', 'a clock is a device', 'a lamp is a device',
  'water is a liquid', 'ice is a solid', 'air is a gas',
  'a doctor is a person', 'a teacher is a person',
];
let bad = [];
for (const t of truths) {
  await forget();
  const a = await brain(t, { from: 29 });
  const name = a.expression?.name;
  if (name === 'deny' || name === 'conflict') bad.push(`${name.padEnd(8)} ${t}`);
}
console.log(`${truths.length - bad.length}/${truths.length} accepted`);
for (const b of bad) console.log('  !!', b);
