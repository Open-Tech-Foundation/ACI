import { openStore, seed, readWorld } from '../src/store.js';
import { fromSources } from '../src/knowledge.js';
import { learningConflict } from '../src/brain.js';
const { file } = await import('runtime:fs');
const root = '/media/G/WD_LINUX_FILES/projects/g/ACI/';
const authored = await file(root + 'data/world.json').json();
const store = await openStore('sqlite::memory:');
await seed(store, authored);
const w = fromSources({ world: await readWorld(store), settled: true }).world;
console.log('terms', w.data.terms.length, 'links', w.data.terms.reduce((n, t) => n + t.links.length, 0));
const learned = { terms: [{ id: w.nextId(), name: 'probe-thing', links: [{ rel: w.baseRelation, to: w.anchors.thing }] }] };
for (let i = 0; i < 3; i++) {
  const s = Date.now();
  const r = learningConflict(w, learned);
  console.log('learningConflict', Date.now() - s, 'ms ->', r);
}
const s2 = Date.now();
const copy = new Map(w.data.terms.map((t) => [t.id, { ...t, links: (t.links || []).map((l) => ({ ...l })) }]));
console.log('copy alone', Date.now() - s2, 'ms', copy.size);
