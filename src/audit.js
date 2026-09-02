/**
 * Measuring a brain — SPEC.md §11.
 *
 * None of this is a score of how good the model is. Every number here is a
 * fact about what was taught, arrived at by walking the training exhaustively,
 * and the point of each one is to make a specific kind of mistake visible:
 * training that can never be reached, states the brain can fall into and never
 * speak from again, and — the interesting ones — how much of what it says
 * actually depends on where a signal arrives.
 *
 * This imports nothing from the host and does not run the brain. It reads the
 * training and walks it.
 */

/**
 * Every state reachable from the start by some sequence of known signals.
 * Breadth-first, so the order is by how few signals it takes to get there.
 */
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
 * What one signal does to the answer, taken over every state it could arrive in.
 *
 * Two different things are worth knowing, and they are easy to confuse:
 *
 * - `means` — the different answers this signal can turn the answer *into*.
 *   More than one means the signal is genuinely ambiguous: the same thing
 *   arriving says different things depending on where it landed. That is the
 *   property the whole model is built to have, so this is the number to watch.
 *
 * - `conditional` — it changes the answer somewhere, and leaves it alone
 *   somewhere else. Weaker than ambiguity but still context: the signal only
 *   does anything once you are somewhere it applies.
 *
 * A signal that never changes the answer anywhere is inert: `means` is empty
 * and `conditional` is false.
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

  /** Reachable, says nothing, and no signal leads anywhere else: a hole. */
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
    /** Taught, but no sequence of signals can ever arrive here. Dead training. */
    unreachable: taught.filter((state) => !live.has(state)).sort(),
    /** Reachable but silent — fine on purpose, a hole by accident. */
    silent: [...live].filter((state) => learned.expressionOf(state) === null).sort(),
    stuck: stuck.sort(),

    /** How many different things it can ever say. */
    answers: answers.size,
    /** Signals that can turn the answer into more than one thing. */
    ambiguous: meanings.filter((row) => row.means.size > 1),
    /** Signals that act in some places and not others. */
    conditional: meanings.filter((row) => row.conditional).map((row) => row.signal),
    /** Signals that never change the answer anywhere. */
    inert: meanings.filter((row) => row.means.size === 0).map((row) => row.signal).sort(),
  };
}
