import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
for (const s of ['hello, how are you?', 'hello how are you?', 'hello, the sky is blue', 'thanks, the sky is blue']) {
  await forget();
  const r = await brain(s, { from: 29 });
  console.log(JSON.stringify(s), '->', r.expression?.name, '|', r.expression?.state?.says, '| branches', r.expression?.branch?.length);
}
