import { openBrain } from '../src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
const run = async (label, lines) => {
  await forget();
  console.log('\n== ' + label);
  for (const s of lines) {
    const r = await brain(s, { from: 29 });
    console.log(`  ${s}\n     -> [${r.expression?.name}] ${r.expression?.state?.says ?? ''}`);
  }
};
await run('one signal, capitals, full stops', ['Sara is older than Tom. Tom is older than Mike. Who is the youngest?']);
await run('separate signals, capitals', ['Sara is older than Tom', 'Tom is older than Mike', 'Who is the youngest?']);
await run('separate signals, lowercase', ['sara is older than tom', 'tom is older than mike', 'who is the youngest?']);
await run('lowercase, asking oldest', ['sara is older than tom', 'tom is older than mike', 'who is the oldest?']);
await run('one word alone', ['Sara is a person']);
