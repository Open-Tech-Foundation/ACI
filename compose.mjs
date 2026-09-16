// Hand the brain a conversation and see how each answer was composed.
//
//   esdev compose.mjs "a basket has 5 apples" "the basket has 8 mangoes" \
//                     "how many fruits does the basket have?"
//
// Every line is told in turn. A line ending in `?` is asked, and what the
// brain composed to answer it is shown: what was asked for, what it was made
// of, and what each part came to. Nothing here works anything out — it reads
// back what the brain left behind.
import { openBrain } from './src/index.js';

const { brain, graphOf, conversation } = openBrain('sqlite::memory:');
const lines = (await import('runtime:process')).args;

if (lines.length === 0) {
  console.log('say something: esdev compose.mjs "a basket has 5 apples" "how many fruits ...?"');
} else {
  // The world as this conversation knows it, so a thing it made of a kind is
  // said by the kind it was made from rather than by the number it was given.
  const spell = (id) => {
    if (id == null) return '—';
    const world = conversation.worldOf ? conversation.worldOf(null) : null;
    const term = world && world.term ? world.term(id) : null;
    if (!term) return String(id);
    return `${term.name.split('#')[0]}[${id}]`;
  };
  const seen = (root, kinds, out = []) => {
    if (!root) return out;
    if (kinds.includes(root.kind)) out.push(root);
    for (const one of root.branch || []) seen(one, kinds, out);
    return out;
  };
  for (const line of lines) {
    const answer = await brain(line);
    const said = answer.expression?.state?.says ?? '';
    console.log(`\n> ${line}`);
    if (!line.trim().endsWith('?')) {
      console.log(`  ${said}`);
      continue;
    }
    const found = seen(
      { kind: 'root', branch: answer.phases?.judge ?? [] },
      ['count', 'sum', 'answer', 'standing'],
    );
    for (const one of found) {
      if (one.kind === 'count') {
        console.log(`  wants   how many`);
        console.log(`  of      ${spell(one.state.of)}`);
        if (one.state.held != null) console.log(`  held by ${spell(one.state.held)}`);
        for (const part of one.state.made || []) {
          console.log(`    ${spell(part.of)} × ${part.value}`);
        }
        console.log(`  = ${one.state.members}`);
      } else if (one.kind === 'sum') {
        console.log(`  wants   a value`);
        if (one.state.left != null) console.log(`    ${one.state.left}, ${one.state.right}`);
        console.log(`  = ${one.state.value}`);
      } else if (one.kind === 'answer') {
        console.log(`  wants   a thing`);
        console.log(`  = ${(one.state.found || []).map(spell).join(', ')}`);
      } else if (one.kind === 'standing') {
        console.log(`  wants   a truth`);
        console.log(`  = ${one.name}`);
      }
    }
    // The steps the brain took, where it took any.
    const steps = conversation.worked.all();
    if (steps.length > 0) {
      console.log('  working');
      for (const step of steps) {
        const from = (step.from || []).length ? `  of ${step.from.join(', ')}` : '';
        console.log(`    ${step.id}  ${step.of}  ${spell(step.holder)}  ${spell(step.thing)} × ${step.value}${from}`);
      }
    }
    console.log(`  says    ${said}`);
  }
}
