/**
 * Experience — SPEC.md §4, §7.
 *
 * What actually happened to this brain, in order. Written on every transition,
 * including the ones where nothing moved, because a signal that failed to move
 * you is still something that happened.
 *
 * It is never read back into a decision. The brain knows only what it was
 * taught; that is what keeps "what we train is what comes out" literally true.
 * Feeding experience back into learning is Layer 4, and deferred.
 */
export class Experience {
  constructor() {
    this.steps = [];
  }

  append({ from, atom, signal, to }) {
    this.steps.push({ seq: this.steps.length + 1, from, atom, signal, to });
    return this;
  }

  /** Every transition, oldest first. */
  all() {
    return this.steps.slice();
  }

  get size() {
    return this.steps.length;
  }
}
