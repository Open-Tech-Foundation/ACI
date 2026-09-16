// Working memory: the stages of working something out, and what each came to.
//
// Three memories, and each holds its own kind of thing. The world holds what is
// so in general. The graph holds what this conversation was told and what
// happened in it. This holds neither: it holds the steps the brain took to
// reach an answer, and the value each step reached.
//
// Nothing here was ever told, so none of it belongs among the facts — a shop
// told it has a hundred and twenty apples and watched thirty leave has ninety,
// and nobody said ninety. But the ninety has to stand somewhere while the next
// question is asked about it, and afterwards, so the brain can say what it was
// worked from. That is what this is.
//
// A stage says what kind of step it was, what it was worked from, what it is a
// quantity of, and what it came to. What it was worked from may be an earlier
// stage or a row of the graph, so a chain reads back to what was actually said.

// A count the conversation gave outright.
export const TOLD = 'told';
// None of it, nobody having said otherwise — what a thing watched arriving
// came to a holder who had never been spoken of as holding any.
export const NONE = 'none';
// A count reached by something happening.
export const MOVED = 'moved';

export function working() {
  let stages = [];
  let counted = 0;

  function clear() {
    stages = [];
    counted = 0;
  }

  // One step, kept in the order it was taken.
  function put(of, state) {
    const id = `s${++counted}`;
    stages.push({ id, of, ...state });
    return id;
  }

  // The stages so far, oldest first.
  const all = () => [...stages];

  // The latest stage that says how much of a thing somebody holds. What a
  // question asks after is where the working has got to, not where it began.
  function latest(holder, thing) {
    for (let i = stages.length - 1; i >= 0; i -= 1) {
      const one = stages[i];
      if (one.holder !== holder || one.thing !== thing) continue;
      return one;
    }
    return null;
  }

  // What a stage was worked from, oldest first: the chain that led to it.
  function back(id) {
    const out = [];
    const seen = new Set();
    const walk = (at) => {
      if (at == null || seen.has(at)) return;
      seen.add(at);
      const one = stages.find((s) => s.id === at);
      if (!one) return;
      for (const of of one.from || []) walk(of);
      out.push(one);
    };
    walk(id);
    return out;
  }

  // What is held, said the way the graph says what it holds.
  function serialize(world) {
    const spell = (id) => {
      if (id == null) return '—';
      if (typeof id === 'string') return id;
      const term = world && world.term(id);
      return term ? `${term.name.split('#')[0]}[${id}]` : String(id);
    };
    const lines = ['working:'];
    for (const one of stages) {
      const from = (one.from || []).length ? `  of ${one.from.join(', ')}` : '';
      const whose = one.holder == null ? '' : `  ${spell(one.holder)}`;
      lines.push(
        `  ${one.id}  ${one.of}${whose}  ${spell(one.thing)} × ${one.value}${from}`,
      );
    }
    lines.push('');
    return lines.join('\n');
  }

  return { clear, put, all, latest, back, serialize };
}
