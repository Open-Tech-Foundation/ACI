import { fromSources } from '../src/knowledge.js';
const { file } = await import('runtime:fs');
const authored = await file('/media/G/WD_LINUX_FILES/projects/g/ACI/data/world.json').json();
const w = fromSources({ world: authored }).world;
const a = w.anchors;
const members = w.members(2676, w.baseRelation);
console.log('members of happening:', members.map((m) => [m, w.term(m)?.name, w.isIndividual(m)]));
for (const m of members) console.log(m, w.term(m)?.name, 'agent:', w.linked(m, a.agent).map((t)=>[t,w.term(t)?.name]));
