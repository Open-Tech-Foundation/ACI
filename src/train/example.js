/**
 * The worked examples from SPEC.md §3.2 and §3.3, as training.
 *
 * This is not a seed of general knowledge and it is not meant to grow into
 * one. It exists so the two examples in the specification can be executed and
 * asserted, and so the demo has something to walk. Every line here is a fact
 * somebody taught; nothing about it is built into the engine.
 */

import { Learned, UNKNOWN } from "../memory/learned.js";

export function trainExample(learned = new Learned()) {
  learned.begins("idle");

  // §3.2 — the original loop: { sense: "touch" } -> { express: "feel" }
  learned.effect("idle", "touch", "comfort");
  learned.expresses("comfort", "feel");

  // §3.3 — the same opening signal, two different walks.
  learned.effect("idle", "hey", "greeted");
  learned.expresses("greeted", "hello");

  learned.effect("greeted", "stop", "alarmed");
  learned.effect("alarmed", "that", "alarmed");
  learned.expresses("alarmed", "back-off");

  // `unknown` is trained like any other signal, per state.
  learned.effect("idle", UNKNOWN, "puzzled");
  learned.effect("greeted", UNKNOWN, "puzzled");
  learned.expresses("puzzled", "what");

  // `idle` is deliberately left with no expression: a state that has not been
  // taught one is silent, and that is a legitimate output.

  return learned;
}
