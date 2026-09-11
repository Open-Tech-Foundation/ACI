import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
for (const s of ['hello', 'hi', 'hey', 'good morning', 'how are you?', 'nice to meet you', 'welcome', 'greetings']) {
  await forget();
  const r = await brain(s, { from: 29 });
  console.log(`${s.padEnd(18)} [${r.expression?.name}] ${r.expression?.state?.says ?? ''}`);
}
