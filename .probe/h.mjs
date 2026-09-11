import { openBrain } from '../src/index.js';
const P = { from: 29 };
for (const s of ['a man is male?','a man is grown?','a woman is male?','a boy is young?','a man is a human?','a girl is female?','a man is a woman?']) {
  const b = openBrain('sqlite::memory:');
  console.log(JSON.stringify(s), '=>', (await b.brain(s, P)).expression?.state?.says);
}
