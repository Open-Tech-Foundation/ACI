import { openStore, seed, readWorld } from '../src/store.js';
import { fromSources } from '../src/knowledge.js';
import { learningConflict } from '../src/brain.js';
const { file } = await import('runtime:fs');
const authored = await file('/media/G/WD_LINUX_FILES/projects/g/ACI/data/world.json').json();
const store = await openStore('sqlite::memory:');
await seed(store, authored);
const w = fromSources({ world: await readWorld(store), settled: true }).world;
const learned = { terms: [{ id: w.nextId(), name: 'probe-thing', links: [{ rel: w.baseRelation, to: w.anchors.thing }] }] };
const time = (name, fn) => {
  fn(); const s = Date.now();
  for (let i = 0; i < 20; i++) fn();
  console.log(name, ((Date.now() - s) / 20).toFixed(2), 'ms per change');
};
time('incremental', () => learningConflict(w, learned));

