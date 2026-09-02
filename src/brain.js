/**
 * brain() — SPEC.md §3.
 *
 * A definite process. Three steps, always the same three, always in this
 * order, with no branching between them and no path around them.
 *
 *   understand()  what is this?          reads learned memory
 *   think()       what does it do to me? moves the brain
 *   solve()       what do I do now?      reads out the state
 *
 * Nothing here knows what a word, a language, an image or an emotion is.
 * Those are all built above this file, out of the same four atoms.
 */

import { UNKNOWN } from "./memory/learned.js";

/**
 * What is this? Resolves an arriving atom to a signal the brain knows, or to
 * the reserved `unknown`. Decides nothing and changes nothing.
 */
export function understand(learned, incoming) {
  return learned.knowsSignal(incoming) ? incoming : UNKNOWN;
}

/**
 * What does it do to me? The only step that moves the brain.
 *
 * Totality: with no taught effect for this exact pair, the state does not
 * change. A signal that means nothing to you does not move you — nothing is
 * inferred, approximated or invented in its place.
 */
export function think(learned, state, signal) {
  const next = learned.effectOf(state, signal);
  return next === null ? state : next;
}

/**
 * What do I do, being in this state? A read-out, not a decision.
 *
 * Totality: a state with no taught expression emits nothing. `null` is
 * silence, and silence is a legitimate output.
 */
export function solve(learned, state) {
  return learned.expressionOf(state);
}

/** Accepts `{ sense }`, a bare atom, or a sequence of atoms. */
function incoming(input) {
  const raw = input !== null && typeof input === "object" && !Array.isArray(input)
    ? input.sense
    : input;
  if (raw === undefined || raw === null) return [];
  return Array.isArray(raw) ? raw : [raw];
}

/**
 * A brain in a session.
 *
 * The current state is the whole of the live context (SPEC.md §4): it is
 * carried from turn to turn, and it is the only thing that makes two identical
 * inputs come out differently. Experience is written on every transition and
 * never read back (SPEC.md §7).
 */
export function createBrain({ learned, experience = null } = {}) {
  if (!learned) throw new Error("a brain needs its learned memory");
  if (learned.start === null) throw new Error("training must declare a start state");

  let state = learned.start;

  return {
    get state() {
      return state;
    },

    /**
     * One turn. A turn may carry several signals; they are applied one at a
     * time, in arrival order, each moving the brain from wherever the last one
     * left it. The expression is read out once, at the end of the sequence —
     * which is why meaning is where the walk ends, not what any one signal is.
     */
    sense(input) {
      const steps = [];
      for (const atom of incoming(input)) {
        const from = state;
        const signal = understand(learned, atom);
        state = think(learned, from, signal);
        const step = { from, atom, signal, to: state };
        steps.push(step);
        experience?.append(step);
      }
      return { express: solve(learned, state), steps };
    },

    /** Returns the brain to the state training says it starts in. */
    reset() {
      state = learned.start;
      return state;
    },
  };
}
