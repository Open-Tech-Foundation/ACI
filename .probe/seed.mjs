import { openStore, seed, readWorld } from '../src/store.js';

const base = {
  anchors: { thing: 1, gone: 3 },
  relations: { is: 2 },
  terms: [
    { id: 1, name: 'thing', links: [] },
    { id: 2, name: 'is', links: [{ rel: 2, to: 1 }] },
    { id: 3, name: 'kite', links: [{ rel: 2, to: 1 }] },
    { id: 4, name: 'drum', links: [{ rel: 2, to: 1 }] },
  ],
};

// 2. a failing update must leave what was there alone
const db = await openStore('sqlite::memory:');
await seed(db, base);
const before = await readWorld(db);
const swapped = JSON.parse(JSON.stringify(base));
swapped.terms[2].name = 'drum';
swapped.terms[3].name = 'kite';
let failed = null;
try { await seed(db, swapped); } catch (e) { failed = e.message.split('\n')[0]; }
const after = await readWorld(db);
console.log('2. update failed with:', failed);
console.log('   links before/after:', before.terms.flatMap(t=>t.links||[]).length, '/', after.terms.flatMap(t=>t.links||[]).length);
console.log('   names after:', after.terms.map(t=>t.name).join(','));

// 3. what the source drops is dropped
const db2 = await openStore('sqlite::memory:');
await seed(db2, base);
const smaller = {
  anchors: { thing: 1 },
  relations: { is: 2 },
  terms: [
    { id: 1, name: 'thing', links: [] },
    { id: 2, name: 'is', links: [{ rel: 2, to: 1 }] },
    { id: 4, name: 'drum', links: [] },
  ],
};
await seed(db2, smaller);
const w2 = await readWorld(db2);
console.log('3. terms:', w2.terms.map(t=>t.name).join(','));
console.log('   anchors:', JSON.stringify(w2.anchors));
console.log('   drum links:', JSON.stringify(w2.terms.find(t=>t.name==='drum').links ?? []));
