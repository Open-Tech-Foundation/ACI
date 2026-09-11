import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
for (const s of ['hi', 'hi hi', 'hi hello', 'hi. hi', 'hello there']) {
  await forget();
  const r = await brain(s, { from: 29 });
  console.log(`> ${s}\n   [${r.expression?.name}] ${r.expression?.state?.says ?? ''}  learned=${JSON.stringify(r.learned)?.slice(0,160)}`);
}
