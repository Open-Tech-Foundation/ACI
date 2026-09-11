import { openBrain } from '../src/index.js';
import { signalsIn } from '../src/brain.js';
import { speaking } from '../src/knowledge.js';
const { file } = await import('runtime:fs');
const root = '/media/G/WD_LINUX_FILES/projects/g/ACI/';
const langs = speaking(await Promise.all(['en.json','hi.json'].map((n) => file(root + 'languages/' + n).json())));
const { brain, forget } = openBrain('sqlite::memory:');
for (const s of [
  'Sara is older than Tom. Tom is older than Mike. Who is the youngest?',
  'a wren is a bird. is a wren a bird?',
  'nila is a crow. what is nila?',
  'i have 3 books. i gave 1 book to tom. how many books do i have?',
  'what is 0.1+0.2?',
  'a crow is a bird!',
]) {
  await forget();
  console.log(`\n> ${s}`);
  console.log('  parts:', JSON.stringify(signalsIn(s, langs)));
  const r = await brain(s, { from: 29 });
  console.log(`  reply: [${r.expression?.name}] ${r.expression?.state?.says ?? ''}`);
}
