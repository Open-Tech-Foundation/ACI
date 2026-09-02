/**
 * Learned memory — SPEC.md §2, §4.
 *
 * The only memory `brain()` reads to decide anything. It holds four kinds of
 * thing and nothing else: signals, states, effects and expressions. There are
 * no numbers in here — no weight, score, valence, intensity or priority — and
 * there is nowhere to put one.
 */

/**
 * The one reserved signal. Anything arriving that has not been taught becomes
 * this. It is not an error case; it is trained like any other signal.
 */
export const UNKNOWN = "unknown";

/** Effects are keyed by a pair, and a NUL cannot occur in an atom's name. */
const SEP = "\u0000";
const pair = (state, signal) => `${state}${SEP}${signal}`;

/**
 * Raised when training contradicts itself. Two different effects for the same
 * `(state, signal)` would make the brain's next move a choice, and the model
 * does not make choices — so this is a fault in the training, not a tie to be
 * broken at run time.
 */
export class ConflictError extends Error {
  constructor(what, key, taught, given) {
    super(`${what} for ${key} is already taught as "${taught}"; refusing "${given}"`);
    this.name = "ConflictError";
  }
}

export class Learned {
  constructor() {
    this.signals = new Set([UNKNOWN]);
    this.states = new Set();
    this.effects = new Map();
    this.expressions = new Map();
    this.start = null;
  }

  /**
   * Atoms are declared by being mentioned. An atom has no properties to set, so
   * there is nothing a separate declaration step could carry — it would only be
   * ceremony. `signals` and `states` exist so that what was taught can be
   * listed back.
   */
  signal(name) {
    this.signals.add(name);
    return name;
  }

  state(name) {
    this.states.add(name);
    return name;
  }

  /** Declares the state the brain is in before anything has happened to it. */
  begins(state) {
    if (this.start !== null && this.start !== state) {
      throw new ConflictError("start state", "the brain", this.start, state);
    }
    this.start = this.state(state);
    return this;
  }

  /** `(state, signal) -> state`. The only kind of fact that can be taught. */
  effect(state, signal, next) {
    this.state(state);
    this.signal(signal);
    this.state(next);
    const key = pair(state, signal);
    const taught = this.effects.get(key);
    if (taught !== undefined && taught !== next) {
      throw new ConflictError("effect", `(${state}, ${signal})`, taught, next);
    }
    this.effects.set(key, next);
    return this;
  }

  /** `state -> signal`. A read-out, not a decision. */
  expresses(state, signal) {
    this.state(state);
    this.signal(signal);
    const taught = this.expressions.get(state);
    if (taught !== undefined && taught !== signal) {
      throw new ConflictError("expression", state, taught, signal);
    }
    this.expressions.set(state, signal);
    return this;
  }

  knowsSignal(name) {
    return this.signals.has(name);
  }

  /** `null` means nothing was taught, which is not the same as a taught move. */
  effectOf(state, signal) {
    const next = this.effects.get(pair(state, signal));
    return next === undefined ? null : next;
  }

  expressionOf(state) {
    const signal = this.expressions.get(state);
    return signal === undefined ? null : signal;
  }

  /** Everything taught, in a shape that can be written to a table. */
  toRows() {
    return {
      start: this.start,
      signals: [...this.signals].sort(),
      states: [...this.states].sort(),
      effects: [...this.effects]
        .map(([key, next]) => {
          const [state, signal] = key.split(SEP);
          return { state, signal, next };
        })
        .sort((a, b) => a.state.localeCompare(b.state) || a.signal.localeCompare(b.signal)),
      expressions: [...this.expressions]
        .map(([state, signal]) => ({ state, signal }))
        .sort((a, b) => a.state.localeCompare(b.state)),
    };
  }

  static fromRows(rows) {
    const learned = new Learned();
    for (const name of rows.signals ?? []) learned.signal(name);
    for (const name of rows.states ?? []) learned.state(name);
    for (const { state, signal, next } of rows.effects ?? []) {
      learned.effect(state, signal, next);
    }
    for (const { state, signal } of rows.expressions ?? []) {
      learned.expresses(state, signal);
    }
    if (rows.start) learned.begins(rows.start);
    return learned;
  }
}
