import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const s of ['i have eight fruits and split them into three groups','tom split a cake into three pieces']) {
  const b = openBrain('sqlite::memory:');
  console.log(JSON.stringify(s), '=>', (await b.brain(s, P)).expression?.state?.says);
  console.log(b.serialize().split('rules:')[0]);
}
