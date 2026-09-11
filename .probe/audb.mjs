import { openBrain } from '../src/index.js';
const { brain } = openBrain('sqlite::memory:');
await brain('hello');
const { fromSources } = await import('../src/knowledge.js');
const { file } = await import('runtime:fs');
const authored = await file('/media/G/WD_LINUX_FILES/projects/g/ACI/data/world.json').json();
const k = fromSources({ world: authored });
const w = k.world;
const a = w.anchors;
console.log('relation anchor', a.relation, 'number', a.number, 'thing', a.thing);
for (const id of [505, 504, 295, 305, 123, 1058]) {
  console.log(id, w.term(id)?.name, 'isA relation:', w.isA(id, a.relation), 'isA thing:', w.isA(id, a.thing), 'isA number:', w.isA(id, a.number));
}
