// What the brain composed to reach an answer, as nested calls.
//
//   esdev compose.mjs "a basket has 5 apples" "the basket has 8 mangoes" \
//                     "how many fruits does the basket have?"
//
// Every line is told in turn; a line ending in `?` is asked, and what it came
// to is shown as the call it made, the holes that call had to fill, and the
// rule each hole was filled by. Values appear only where a hole was filled by
// one — the point is the shape, so that a wrong answer can be seen as a wrong
// composition rather than guessed at.
//
// Nothing here works anything out. It reads back what the brain left behind.
import { openBrain } from './src/index.js';

const { brain, conversation } = openBrain('sqlite::memory:');
const lines = (await import('runtime:process')).args;

const PAD = 46;
const name = (world, id) => {
  if (id == null) return '—';
  const term = world && world.term ? world.term(id) : null;
  return term ? term.name.split('#')[0] : String(id);
};

// Every node of one kind in the tree, in the order it was reached.
const gather = (roots, kinds, out = []) => {
  for (const one of roots || []) {
    if (kinds.includes(one.kind)) out.push(one);
    gather(one.branch, kinds, out);
  }
  return out;
};

if (lines.length === 0) {
  console.log('say something: esdev compose.mjs "a basket has 5 apples" "how many fruits ...?"');
} else {
  for (const line of lines) {
    const answer = await brain(line);
    const said = answer.expression?.state?.says ?? '';
    const asking = line.trim().endsWith('?');
    if (!asking) {
      console.log(`\n> ${line}\n  ${said}`);
      continue;
    }
    console.log(`\n> ${line}\n`);
    const world = conversation.worldOf(null);
    const of = (id) => name(world, id);
    const steps = conversation.worked.all();
    // How a thing came to the number it is at: what it was told, and every
    // rule that moved it since.
    const ruleChain = (thing, holder) => {
      const mine = steps.filter(
        (s) => s.thing === thing && (holder == null || s.holder === holder),
      );
      if (mine.length === 0) return null;
      return mine
        .map((s) => (s.of === 'moved' ? `${of(s.by)}(${s.amount})` : `${s.of}(${s.value})`))
        .join(' → ');
    };
    // What is worked first, and what each step leads to. The numbers are the
    // order the brain arrived at them in, so a wrong answer can be followed
    // back to the step that went wrong.
    let step = 0;
    const line_ = (depth, call, value, counts = false) => {
      const mark = counts ? `${String(++step)}. ` : '   ';
      const left = `${mark}${'   '.repeat(depth)}${call}`;
      console.log(`  ${left.padEnd(PAD)}${value == null ? '' : `→ ${value}`}`);
    };
    for (const one of gather(answer.phases?.judge, ['count', 'sum', 'answer', 'standing'])) {
      const s = one.state;
      if (one.kind === 'count') {
        const made = s.made || [];
        line_(0, `count(${of(s.of)}, in: ${of(s.held)})`, made.length > 1 ? null : s.members);
        for (const part of made) {
          const chain = ruleChain(part.of, s.held) ?? ruleChain(world.kinds(part.of)[0], s.held);
          line_(1, chain ? `${of(part.of)}  ${chain}` : `${of(part.of)}`, part.value, true);
        }
        if (made.length > 1) line_(1, 'sum', s.members, true);
        else {
          const chain = ruleChain(s.of, s.held) ?? ruleChain(world.oneOf(s.of), s.held);
          if (chain) line_(1, chain, s.members, true);
        }
      } else if (one.kind === 'sum') {
        line_(0, s.left == null ? 'work()' : `work(${s.left}, ${s.right})`, s.value, true);
      } else if (one.kind === 'answer') {
        line_(0, `find(${(s.found || []).map(of).join(', ')})`, null);
      } else if (one.kind === 'standing') {
        line_(0, `check(${of(s.subject)}, ${of(s.relation)}, ${of(s.object)})`, one.name);
      }
    }
    console.log(`\n  = ${said}`);
  }
}
