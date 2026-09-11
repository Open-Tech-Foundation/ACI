import { openBrain } from '../src/index.js';
import { serialize, clear } from '../src/graph.js';
for (const run of [
  ['the boat is called pearl', 'a pearl is white', 'pearl is fast', 'what is pearl?', 'i found two pearls'],
  ['the hotel is called rose', 'i picked a rose', 'the rose has 20 rooms', 'what does rose have?'],
]) {
  clear();
  const { brain } = openBrain('sqlite::memory:');
  for (const s of run) {
    const r = await brain(s);
    console.log(JSON.stringify(s), '=>', r.expression?.state?.says);
  }
  console.log(serialize());
  console.log('======');
}
