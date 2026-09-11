import { fromSources } from '../src/knowledge.js';
const { file } = await import('runtime:fs');
const authored = await file(new URL('../data/world.json', import.meta.url).pathname).json();
const { world } = fromSources({ world: authored });
const a = world.anchors;
let orderings = 0, loose = 0;
for (const t of world.data.terms) {
  const of = (t.links || []).filter((l) => l.rel === a.compares).map((l) => l.to)[0];
  if (of == null) continue;
  const scale = world.isA(of, a.property);
  const states = scale ? world.linked(of, a.measure) : [of];
  const said = states
    .map((s) => `${world.term(s).name}${world.linked(s, a.toward)[0] === a.less ? '-' : '+'}`)
    .join(' ');
  if (scale) orderings += 1; else loose += 1;
  console.log((scale ? world.term(of).name : '(own)').padEnd(13), said);
}
console.log(`\n${orderings} orderings on scales, ${loose} comparisons on none`);
