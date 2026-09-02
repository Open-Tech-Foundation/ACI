/** Signals, states, effects, expressions. No numbers. SPEC.md §2, §4. */

/** Anything arriving that was not taught becomes this. */
export const UNKNOWN = "unknown";

const SEP = "\u0000";
const pair = (state, signal) => `${state}${SEP}${signal}`;

/** Contradictory training. The brain's next move must never be a choice. */
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

  /** Atoms are declared by being mentioned; they carry nothing to declare. */
  signal(name) {
    this.signals.add(name);
    return name;
  }

  state(name) {
    this.states.add(name);
    return name;
  }

  /** Where the brain is before anything has happened to it. */
  begins(state) {
    if (this.start !== null && this.start !== state) {
      throw new ConflictError("start state", "the brain", this.start, state);
    }
    this.start = this.state(state);
    return this;
  }

  /** `(state, signal) -> state`. The only kind of fact there is. */
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

  /** `state -> signal`. */
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

  /** `null` means nothing was taught — not the same as a taught self-loop. */
  effectOf(state, signal) {
    const next = this.effects.get(pair(state, signal));
    return next === undefined ? null : next;
  }

  expressionOf(state) {
    const signal = this.expressions.get(state);
    return signal === undefined ? null : signal;
  }

  /** Everything taught, in a shape a table can hold. */
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
