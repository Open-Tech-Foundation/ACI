/** brain(): understand, then think, then solve. Always. SPEC.md §3. */

import { UNKNOWN } from "./memory/learned.js";

/** What is this? Resolves to a known signal, or to `unknown`. */
export function understand(learned, incoming) {
  return learned.knowsSignal(incoming) ? incoming : UNKNOWN;
}

/** What does it do to me? No taught effect, no movement. */
export function think(learned, state, signal) {
  const next = learned.effectOf(state, signal);
  return next === null ? state : next;
}

/** What do I do now? `null` is silence, which is an answer. */
export function solve(learned, state) {
  return learned.expressionOf(state);
}

function incoming(input) {
  const raw =
    input !== null && typeof input === "object" && !Array.isArray(input)
      ? input.sense
      : input;
  if (raw === undefined || raw === null) return [];
  return Array.isArray(raw) ? raw : [raw];
}

/** A session. The state carries between turns and is the whole live context. */
export function createBrain({ learned, experience = null } = {}) {
  if (!learned) throw new Error("a brain needs its learned memory");
  if (learned.start === null) throw new Error("training must declare a start state");

  let state = learned.start;

  return {
    get state() {
      return state;
    },

    /** Signals are applied one at a time; the answer is read out at the end. */
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

    reset() {
      state = learned.start;
      return state;
    },
  };
}
