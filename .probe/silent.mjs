import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
const lines = [
  'a box holds 3 red balls and 2 blue balls',
  'all but 3 run away',
  'a farmer has 10 sheep',
  'the crate weighs 5 kilograms',
  'mira is a heron',
  'kiran waited during the storm',
  'nila sang because kiran arrived',
  'four people are standing in a line',
  'rahul eats 3 and priya eats 2',
  'some thing is cold',
  'a drum is cold',
  'if a drum is cold then a bell is red',
];
for (const line of lines) {
  await forget();
  const a = await brain(line, { from: 29 });
  const said = a.expression?.state?.says ?? a.expression?.name;
  const took = a.learned ? `${a.learned.terms.length} terms` : 'nothing';
  const lying = said === 'I understand.' && !a.learned;
  console.log(`${lying ? '!!' : '  '} ${said.padEnd(22)} ${took.padEnd(10)} ${line}`);
}
