import { openBrain } from './src/index.js';
const { brain, conversation } = openBrain('sqlite::memory:');
for (const line of (await import('runtime:process')).args) await brain(line);
const w = conversation.worldOf();
for (let id = 54100; id < 54112; id += 1) { const t = w.term(id); if (t) console.log(id, t.name, JSON.stringify(t.links)); }
console.log('held(3044,591,221)=', w.held(3044, 591, 221));
