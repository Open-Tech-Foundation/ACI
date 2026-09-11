import { openWorld } from '../src/world.js';
const w = await openWorld('sqlite::memory:');
for (const n of ['cafe','mango','eagle','rocket','tiger','pearl','storm','boat','horse','ship','bank','crane','team','band','rose','ruby','hotel','restaurant']) {
  const t = w.termNamed(n);
  console.log(n, t ? `${t.id}` : '-');
}
