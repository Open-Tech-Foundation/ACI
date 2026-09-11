import { signalsIn } from '../src/brain.js';
import { speaking } from '../src/knowledge.js';
const { file, dir } = await import('runtime:fs');
const root = '/media/G/WD_LINUX_FILES/projects/g/ACI/';
const names = ['en.json', 'hi.json'];
const langs = speaking(await Promise.all(names.map((n) => file(root + 'languages/' + n).json())));
for (const s of [
  'Sara is older than Tom. Tom is older than Mike. Who is the youngest?',
  'sara is older than tom',
  'what is 0.1+0.2?',
  'the sky is blue. is the grass green?',
  'hello!',
]) console.log(JSON.stringify(s), '->', JSON.stringify(signalsIn(s, langs)));
