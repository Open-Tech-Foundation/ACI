import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const s of ['a man is a woman?','a woman is a man?','a boy is a girl?','a boy is a man?','a man is a human?','a person is a man?','a man is a person?','a child is a man?','a cat is a tiger?']) {
  const b = openBrain('sqlite::memory:');
  console.log(JSON.stringify(s), '=>', (await b.brain(s, P)).expression?.state?.says);
}
