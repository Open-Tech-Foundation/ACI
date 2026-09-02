/**
 * Measuring what a brain was taught. SPEC.md §11.
 *
 * Not scores — facts, from walking the training exhaustively.
 */

/** Every state some sequence of signals can arrive at, from the start. */
export function reachable(learned) {
  const seen = new Set([learned.start]);
  const queue = [learned.start];

  while (queue.length > 0) {
    const state = queue.shift();
    for (const signal of learned.signals) {
      const next = learned.effectOf(state, signal);
      if (next !== null && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }

  return seen;
}

/**
 * What one signal does to the answer, over every state it could arrive in.
 *
 * `means` holds the answers it can produce — more than one is ambiguity, the
 * property the model is built for. `conditional` is weaker: it acts somewhere
 * and not elsewhere. Neither, and the signal is inert.
 */
export function meaningOf(learned, signal, states = reachable(learned)) {
  const means = new Set();
  let inertSomewhere = false;

  for (const state of states) {
    const next = learned.effectOf(state, signal);
    const landed = next === null ? state : next;
    const before = learned.expressionOf(state);
    const after = learned.expressionOf(landed);

    if (after === before) inertSomewhere = true;
    else means.add(after);
  }

  return { signal, means, conditional: means.size > 0 && inertSomewhere };
}

export function audit(learned) {
  const live = reachable(learned);
  const taught = [...learned.states];

  const answers = new Set();
  for (const state of live) {
    const said = learned.expressionOf(state);
    if (said !== null) answers.add(said);
  }

  /** Says nothing and leads nowhere: fall in and never speak again. */
  const stuck = [...live].filter(
    (state) =>
      learned.expressionOf(state) === null &&
      [...learned.signals].every((signal) => learned.effectOf(state, signal) === null),
  );

  const meanings = [...learned.signals]
    .map((signal) => meaningOf(learned, signal, live))
    .sort((a, b) => b.means.size - a.means.size || a.signal.localeCompare(b.signal));

  return {
    start: learned.start,
    signals: learned.signals.size,
    states: taught.length,
    effects: learned.effects.size,
    expressions: learned.expressions.size,

    reachable: live.size,
    /** Taught, but nothing can arrive here. Dead rows. */
    unreachable: taught.filter((state) => !live.has(state)).sort(),
    /** Silent: fine on purpose, a hole by accident. */
    silent: [...live].filter((state) => learned.expressionOf(state) === null).sort(),
    stuck: stuck.sort(),

    /** Its whole expressive range. */
    answers: answers.size,
    /** Turn the answer into more than one thing. */
    ambiguous: meanings.filter((row) => row.means.size > 1),
    /** Act in some places and not others. */
    conditional: meanings.filter((row) => row.conditional).map((row) => row.signal),
    /** Never change the answer anywhere. */
    inert: meanings.filter((row) => row.means.size === 0).map((row) => row.signal).sort(),
  };
}
