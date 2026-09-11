import { openBrain } from '../src/index.js';
import { fromSources } from '../src/knowledge.js';
const { file } = await import('runtime:fs');
const root = new URL('../', import.meta.url).pathname;
const authored = await file(`${root}data/world.json`).json();
const { openStore, seed, readWorld, write } = await import('../src/store.js');
const store = await openStore('sqlite::memory:');
await seed(store, authored);
const mark = async (name, n, work) => {
  const t = performance.now();
  for (let i = 0; i < n; i += 1) await work(i);
  console.log(`${name.padEnd(24)} ${((performance.now() - t) / n).toFixed(1)} ms`);
};
await mark('readWorld', 10, () => readWorld(store));
const back = await readWorld(store);
await mark('fromSources settled', 10, async () => fromSources({ world: back, settled: true }));
await mark('write one fact', 10, (i) =>
  write(store, { terms: [{ id: 4000 + i, name: `x${i}`, individual: true, links: [] }] }));
