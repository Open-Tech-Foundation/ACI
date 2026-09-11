import { openBrain } from '../src/index.js';
const P = { from: 29 };
const b = openBrain('sqlite::memory:');
for (const s of ['a dolphin is a fish?','a dolphin is a mammal?','a dolphin is warm?','a mammal gives milk','a dolphin gives milk?']) {
  console.log(JSON.stringify(s), '=>', (await b.brain(s, P)).expression?.state?.says);
}
