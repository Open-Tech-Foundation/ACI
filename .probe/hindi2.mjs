import { brainFrom } from '../src/brain.js';
import { fromSources } from '../src/knowledge.js';
const { file } = await import('runtime:fs');
const world = await file(new URL('../data/world.json', import.meta.url).pathname).json();
const hindi = await file(new URL('../languages/hi.json', import.meta.url).pathname).json();
const en = await file(new URL('../languages/en.json', import.meta.url).pathname).json();
for (const [name, pack, line] of [['hindi', hindi, 'लूना बिल्ली है'], ['english', en, 'luna is a cat']]) {
  const r = brainFrom(line, fromSources({ world, languages: [pack] }));
  const kinds = [];
  const walk = (n) => { kinds.push(n.kind); (n.branch || []).forEach(walk); };
  (r.roots || []).forEach(walk);
  console.log(name, '|', r.expression.name, '| learned', r.learned ? r.learned.terms.length : null,
    '|', [...new Set(kinds)].filter((k) => ['call','learn','standing','named'].includes(k)).join(','));
}
