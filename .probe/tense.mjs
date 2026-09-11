import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
for (const s of ['nila arrived', 'nila will arrive', 'nila is arriving']) {
  await forget();
  const r = await brain(s, { from: 29 });
  const ev = JSON.stringify(r.learned).match(/"when":\d+|"at":\d+/g);
  console.log(`${s.padEnd(20)} learned=${JSON.stringify(r.learned)?.slice(0,150)}`);
}
