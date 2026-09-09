// Hand the brain a signal and see what it put into the conversation graph.
//
//   esdev structure.mjs "meera has 5 books" "meera gives 2 books to dev"
//
// Every line is one signal in one conversation, so what an earlier line put in
// is still there when a later one is read.
import { openBrain } from './src/index.js';

function show(what, held, line) {
  if (!held || held.length === 0) return;
  console.log(`  ${what}`);
  for (const one of held) console.log(`    ${line(one)}`);
}

const slots = (held) =>
  Object.entries(held)
    .map(([role, value]) => `${role}: ${value}`)
    .join(', ');

const claim = (side) =>
  side && side.claim
    ? `${side.claim.subjectName ?? side.claim.subject} ${side.claim.name} ${side.claim.objectName ?? side.claim.object}`
    : '—';

const { read } = openBrain('sqlite::memory:');
const lines = (await import('runtime:process')).args;

if (lines.length === 0) {
  console.log('say something: esdev structure.mjs "meera has 5 books"');
} else {
  for (const line of lines) {
    const laid = await read(line);
    console.log(`\n> ${line}`);
    console.log(`  ${laid.says}`);
    show('nodes', laid.nodes, (one) => `${one.id}  ${one.name ?? '?'}${one.called ? ` called ${one.called}` : ''}`);
    show('collections', laid.collections, (one) => `${one.id}  ${one.name} × ${one.count}`);
    show('actions', laid.actions, (one) => `${one.id}  ${one.name}(${slots(one.slots)})`);
    show('facts', laid.facts, (one) =>
      `${one.id}  ${one.slots.subject} ${one.denied ? 'not ' : ''}${one.name} ${one.slots.object}` +
      (one.count != null ? ` × ${one.count}` : ''));
    show('rules', laid.rules, (one) => `${one.id}  on ${claim(one.on)} -> ${claim(one.then)}`);
  }
}
