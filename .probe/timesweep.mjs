import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
const run = async (name, ...lines) => {
  await forget(); console.log('\n## ' + name);
  for (const s of lines) {
    let r; try { r = await brain(s, { from: 29 }); } catch (e) { console.log(`  !! ${s} — ${e.message}`); continue; }
    console.log(`  ${(r.expression?.name ?? '?').padEnd(10)} ${s.padEnd(34)} ${r.expression?.state?.says ?? ''}`);
  }
};
await run('tense', 'nila arrived', 'did nila arrive?', 'nila arrives', 'nila will arrive', 'nila is arriving');
await run('when it happened', 'nila arrived yesterday', 'when did nila arrive?', 'nila arrived at six');
await run('order of doings', 'nila arrived before ravi', 'who arrived first?', 'did ravi arrive after nila?');
await run('naming times', 'what day is it?', 'what time is it?', 'is monday before tuesday?', 'what comes after monday?');
await run('units', 'an hour has sixty minutes', 'how many minutes are in an hour?', 'a day has how many hours?');
await run('duration', 'the meeting took two hours', 'how long was the meeting?', 'nila slept for eight hours');
await run('past and now', 'nila has five books', 'nila had three books', 'how many books does nila have?');
