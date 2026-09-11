import { openStore, seed, write, readWorld } from '../src/store.js';
const db = await openStore('sqlite::memory:');
await seed(db, { anchors: { thing: 1 }, relations: { is: 2 }, terms: [
  { id: 1, name: 'thing', links: [] }, { id: 2, name: 'is', links: [] }, { id: 3, name: 'gram', links: [] },
]});
await write(db, { terms: [{ id: 1, name: 'thing', links: [{ rel: 2, to: 3, quantity: '0.30000000000000004', at: 1 }] }] });
const w = await readWorld(db);
const l = w.terms.find((t) => t.id === 1).links[0];
console.log('read back:', JSON.stringify(l.quantity), typeof l.quantity);
