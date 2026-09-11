import { openStore, seed, readWorld, write } from '../src/store.js';
import { fromSources } from '../src/knowledge.js';
import { learningConflict } from '../src/brain.js';
const { file } = await import('runtime:fs');
const root = '/media/G/WD_LINUX_FILES/projects/g/ACI/';
const authored = await file(root + 'data/world.json').json();
const store = await openStore('sqlite::memory:');
await seed(store, authored);
let w = fromSources({ world: await readWorld(store), settled: true }).world;
const a = w.anchors;
const IS = w.baseRelation;
const id = (name) => { const t = w.data.terms.find((x) => x.name === name); return t ? t.id : null; };
let next = w.nextId();
const N = () => next++;
const cases = [];
const add = (why, terms) => cases.push({ why, learned: { terms } });

const THING = a.thing, ANIMAL = id('animal'), FISH = id('fish'), CAT = id('cat'), DOG = id('dog');
const BEFORE = id('before'), AFTER = id('after'), PART = id('part'), SAME = a.same, DIFF = a.different;
const SUB = a.subtype, INST = a.instance, PRED = a.predication, DOM = a.domain, RNG = a.range;
const SUBREL = a.subrelation, CONV = a.converse, HAS = a.has;

const x = N(), y = N(), z = N();
add('clean: a new thing of a kind', [{ id: x, name: 'zeta', links: [{ rel: IS, to: CAT }] }]);
add('clean: two new things joined', [
  { id: x, name: 'zeta', links: [{ rel: IS, to: CAT }] },
  { id: y, name: 'yota', links: [{ rel: BEFORE, to: x }] },
]);
add('bad: holds and denies', [{ id: x, name: 'zeta', links: [{ rel: IS, to: CAT }, { rel: IS, to: CAT, not: true }] }]);
add('bad: two quantities', [{ id: x, name: 'zeta', links: [{ rel: HAS, to: CAT, quantity: 1 }, { rel: HAS, to: CAT, quantity: 2 }] }]);
add('bad: unknown endpoint', [{ id: x, name: 'zeta', links: [{ rel: IS, to: 999999 }] }]);
add('bad: unknown relation', [{ id: x, name: 'zeta', links: [{ rel: 999999, to: CAT }] }]);
add('bad: name already taken', [{ id: x, name: 'cat', links: [] }]);
add('bad: asymmetric self', [{ id: x, name: 'zeta', links: [{ rel: BEFORE, to: x }] }]);
add('bad: asymmetric both ways', [
  { id: x, name: 'zeta', links: [{ rel: BEFORE, to: y }] },
  { id: y, name: 'yota', links: [{ rel: BEFORE, to: x }] },
]);
add('bad: asymmetric cycle of three', [
  { id: x, name: 'zeta', links: [{ rel: BEFORE, to: y }] },
  { id: y, name: 'yota', links: [{ rel: BEFORE, to: z }] },
  { id: z, name: 'wota', links: [{ rel: BEFORE, to: x }] },
]);
add('bad: asymmetric both ways through converse', [
  { id: x, name: 'zeta', links: [{ rel: BEFORE, to: y }] },
  { id: y, name: 'yota', links: [{ rel: BEFORE, to: x }] },
]);
add('clean: converse written the other way', [
  { id: x, name: 'zeta', links: [{ rel: BEFORE, to: y }] },
  { id: y, name: 'yota', links: [{ rel: AFTER, to: z }] },
  { id: z, name: 'wota', links: [] },
]);
add('bad: cycle through converse', [
  { id: x, name: 'zeta', links: [{ rel: BEFORE, to: y }] },
  { id: y, name: 'yota', links: [{ rel: AFTER, to: x }] },
]);
add('bad: irreflexive self', [{ id: x, name: 'zeta', links: [{ rel: DIFF, to: x }] }]);
add('bad: symmetric disagreement', [
  { id: x, name: 'zeta', links: [{ rel: DIFF, to: y }] },
  { id: y, name: 'yota', links: [{ rel: DIFF, to: x, not: true }] },
]);
add('clean: symmetric agreement', [
  { id: x, name: 'zeta', links: [{ rel: DIFF, to: y }] },
  { id: y, name: 'yota', links: [{ rel: DIFF, to: x }] },
]);
add('bad: classification cycle', [
  { id: x, name: 'zeta', links: [{ rel: IS, to: y }] },
  { id: y, name: 'yota', links: [{ rel: IS, to: x }] },
]);
add('bad: classification cycle into the world', [{ id: x, name: 'zeta', links: [{ rel: IS, to: CAT }, { rel: IS, to: x }] }]);
add('bad: subtype from an individual', [{ id: x, name: 'zeta', individual: true, links: [{ rel: SUB, to: CAT }] }]);
add('bad: instance from a kind', [{ id: x, name: 'zeta', links: [{ rel: INST, to: CAT }] }]);
add('bad: predication of a non-property', [{ id: x, name: 'zeta', links: [{ rel: PRED, to: CAT }] }]);
add('clean: predication of a property', [{ id: x, name: 'zeta', links: [{ rel: PRED, to: id('blue') }] }]);
add('bad: domain on a non-relation', [{ id: x, name: 'zeta', links: [{ rel: DOM, to: CAT }] }]);
add('bad: identity joins exclusive kinds', [
  { id: x, name: 'zeta', links: [{ rel: IS, to: CAT }] },
  { id: y, name: 'yota', links: [{ rel: IS, to: FISH }, { rel: SAME, to: x }] },
]);
add('clean: identity of like kinds', [
  { id: x, name: 'zeta', links: [{ rel: IS, to: CAT }] },
  { id: y, name: 'yota', links: [{ rel: IS, to: CAT }, { rel: SAME, to: x }] },
]);
add('bad: identity denied and held', [
  { id: x, name: 'zeta', links: [{ rel: SAME, to: y }, { rel: SAME, to: y, not: true }] },
  { id: y, name: 'yota', links: [] },
]);
add('bad: subrelation cycle', [
  { id: x, name: 'zeta', links: [{ rel: IS, to: a.relation }, { rel: SUBREL, to: y }] },
  { id: y, name: 'yota', links: [{ rel: IS, to: a.relation }, { rel: SUBREL, to: x }] },
]);
add('bad: subrelation of a non-relation', [{ id: x, name: 'zeta', links: [{ rel: IS, to: a.relation }, { rel: SUBREL, to: CAT }] }]);
add('bad: denied broader beside narrower', [
  { id: x, name: 'zeta', links: [{ rel: id('more-big'), to: y }, { rel: a.more, to: y, not: true }] },
  { id: y, name: 'yota', links: [] },
]);
add('bad: a cat is not an animal, and is one', [
  { id: x, name: 'zeta', links: [{ rel: IS, to: CAT }, { rel: IS, to: FISH }] },
]);

for (const { why, learned } of cases) {
  console.log(`${why} => ${learningConflict(w, learned)}`);
}
