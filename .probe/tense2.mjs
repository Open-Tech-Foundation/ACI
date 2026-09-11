import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
const show = (t) => (t.terms || []).filter((x) => x.name.includes('#')).map((x) => x.name + ':' + JSON.stringify(x.links));
for (const s of ['nila arrived', 'nila will arrive', 'nila is arriving', 'nila arrived yesterday']) {
  await forget();
  const r = await brain(s, { from: 29 });
  console.log(`${s.padEnd(24)} ${r.learned ? show(r.learned).join(' | ').slice(0,170) : 'null'}`);
}
