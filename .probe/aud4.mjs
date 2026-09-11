import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
await forget();
const t0 = Date.now();
await brain('mira is a teacher');
console.log('first turn ms', Date.now() - t0);
const names = ['ravi','sona','ilan','deva','arun','bina','chit','dara','esha','fira'];
let learnT = 0;
for (let i = 0; i < 40; i++) {
  const n = names[i % 10] + i;
  const t = Date.now();
  await brain(`${n} is a teacher`);
  learnT += Date.now() - t;
  if (i % 10 === 9) console.log(`after ${i+1} learned facts, last turn ms`, Date.now() - t);
}
console.log('total learn ms', learnT);
const t2 = Date.now();
await brain('is mira a teacher?');
console.log('question turn ms', Date.now() - t2);
await forget();
