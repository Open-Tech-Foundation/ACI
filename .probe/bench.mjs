import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
const cases = [
  [['All cats are animals.', 'Tom is a cat.', 'Is Tom an animal?'], 'Yes'],
  [['All birds have wings.', 'A sparrow is a bird.', 'Does a sparrow have wings?'], 'Yes'],
  [['John is taller than Sam.', 'Sam is taller than Alex.', 'Who is the tallest?'], 'John'],
  [['A box contains 3 red balls and 2 blue balls.', 'How many balls are there in total?'], '5'],
  [['If today is Monday, what day will it be after 3 days?'], 'Thursday'],
  [['Alice is older than Bob.', 'Bob is older than Charlie.', 'Is Charlie older than Alice?'], 'No'],
  [['Every employee has an ID card.', 'Ravi is an employee.', 'Does Ravi have an ID card?'], 'Yes'],
  [['There are 10 apples.', 'Rahul eats 3 and Priya eats 2.', 'How many apples remain?'], '5'],
  [['If it rains, the ground gets wet.', 'It is raining.', 'Is the ground wet?'], 'Yes'],
  [['If the light is on, the room is bright.', 'The room is bright.', 'Can we definitely conclude that the light is on?'], 'No'],
  [['All dogs are mammals.', 'Some mammals can swim.', 'Can we conclude that all dogs can swim?'], 'No'],
  [['A is to the left of B.', 'B is to the left of C.', 'Is A to the left of C?'], 'Yes'],
  [['Mary has twice as many chocolates as John.', 'John has 4 chocolates.', 'How many does Mary have?'], '8'],
  [['Four people are standing in a line.', 'A is before B, B is before C, and C is before D.', 'Who is last?'], 'D'],
  [['A farmer has 10 sheep.', 'All but 3 run away.', 'How many sheep remain?'], '3'],
];
let n = 0;
for (const [lines, want] of cases) {
  n += 1;
  await forget();
  const said = [];
  for (const line of lines) {
    const a = await brain(line, { from: 29 });
    said.push(a.expression?.state?.says ?? a.expression?.name ?? '(nothing)');
  }
  console.log(`${String(n).padStart(2)}. want ${want}`);
  lines.forEach((l, i) => console.log(`    > ${l}\n      ${said[i]}`));
}
