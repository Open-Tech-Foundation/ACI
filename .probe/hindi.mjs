import { brainFrom } from '../src/brain.js';
import { fromSources } from '../src/knowledge.js';
const { file } = await import('runtime:fs');
const world = await file(new URL('../data/world.json', import.meta.url).pathname).json();
const hindi = await file(new URL('../languages/hi.json', import.meta.url).pathname).json();
const knowledge = fromSources({ world, languages: [hindi] });
const r = brainFrom('लूना बिल्ली है', knowledge);
console.log('intent', r.expression.name, '| learned', r.learned ? r.learned.terms.length : null, '| names', JSON.stringify(r.names));
