import { fromSources } from '../src/knowledge.js';
const IS = 1, NEXT = 2, REL = 3;
const days = ['mon','tue','wed','thu','fri','sat','sun'];
const terms = [
  { id: REL, name: 'relation', links: [] },
  { id: IS, name: 'is', links: [] },
];
days.forEach((d, i) => terms.push({ id: 10 + i, name: d, links: [{ rel: NEXT, to: 10 + ((i + 1) % 7) }] }));
const make = (marks) => ({
  anchors: { relation: REL },
  relations: { is: IS },
  terms: [...terms, { id: NEXT, name: 'next', links: [{ rel: IS, to: REL }], ...marks }],
});
const w = fromSources({ world: make({ asymmetric: true }) }).world;
const name = (id) => w.term(id)?.name ?? id;
console.log('after sun  ->', w.related(16, NEXT).map(name));
console.log('after mon  ->', w.related(10, NEXT).map(name));
console.log('who points at mon ->', w.pointing(10, NEXT).map(name));
// three steps on from monday
let at = 10;
for (let i = 0; i < 3; i += 1) at = w.related(at, NEXT)[0];
console.log('three on from mon ->', name(at));
