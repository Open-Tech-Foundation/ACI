import { openStore, seed, readWorld } from '../src/store.js';
import { sql } from 'runtime:db';
const base = { anchors: { thing: 1 }, relations: { is: 2 }, terms: [
  { id: 1, name: 'thing', links: [] },
  { id: 2, name: 'is', links: [{ rel: 2, to: 1 }] },
  { id: 3, name: 'kite', links: [{ rel: 2, to: 1 }] },
]};
const db = await openStore('sqlite::memory:');
await seed(db, base);
await db.execute(sql`insert into term (id, name, learned) values (9, 'mine', 1)`);
await db.execute(sql`insert into link (term, rel, target, learned) values (9, 2, 3, 1)`);
const smaller = { anchors: { thing: 1 }, relations: { is: 2 }, terms: base.terms.slice(0, 2) };
await seed(db, smaller);
const w = await readWorld(db);
console.log('terms:', w.terms.map(t => t.name).join(','));
console.log('mine links:', JSON.stringify(w.terms.find(t => t.name === 'mine')?.links ?? []));
