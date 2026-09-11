import { openStore, seed, readWorld } from '../src/store.js';
import { fromSources } from '../src/knowledge.js';
const { file } = await import('runtime:fs');
const authored = await file('/media/G/WD_LINUX_FILES/projects/g/ACI/data/world.json').json();
const store = await openStore('sqlite::memory:');
await seed(store, authored);
const w = fromSources({ world: await readWorld(store), settled: true }).world;
const a = w.anchors;
const cat = w.data.terms.find((t) => t.name === 'cat').id;
console.log('predication anchor', a.predication, 'property', a.property, 'cat', cat);
console.log('world.kinds(cat)', w.kinds(cat));
console.log('isA(cat, property)', w.isA(cat, a.property));
let found = new Set(); const pending = [cat];
while (pending.length) { const h = pending.pop(); if (found.has(h)) continue; found.add(h); for (const k of w.kinds(h)) pending.push(k); }
console.log('ancestors', [...found].map((i) => w.term(i)?.name).join(', '));
