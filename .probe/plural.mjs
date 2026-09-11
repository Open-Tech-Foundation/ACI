import { speaking } from '../src/knowledge.js';
const { readDir, file } = await import('runtime:fs');
const dir = new URL('../languages/', import.meta.url).pathname;
const names = (await readDir(dir)).filter((e) => e.isFile && e.name.endsWith('.json')).map((e) => e.name).sort();
const packs = [];
for (const n of names) packs.push(await file(dir + n).json());
const [en] = speaking(packs).filter((l) => l.data.name === 'english');
const w = JSON.parse(await file(new URL('../data/world.json', import.meta.url).pathname).text());
const id = (name) => w.terms.find((t) => t.name === name).id;
for (const n of ['metre', 'gram', 'box', 'city', 'hour', 'kilogram']) {
  console.log(n.padEnd(10), en.manyWordFor(id(n)));
}
