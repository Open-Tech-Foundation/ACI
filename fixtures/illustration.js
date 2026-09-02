/**
 * Placeholder words for tests and the CLI. NOT the model's knowledge.
 *
 * Real training has not begun. It lives outside src/ because the engine ships
 * with no vocabulary at all.
 */

import { Learned, UNKNOWN } from "../src/memory/learned.js";

export function illustration(learned = new Learned()) {
  learned.begins("idle");

  learned.effect("idle", "touch", "comfort");
  learned.expresses("comfort", "feel");

  learned.effect("idle", "hey", "greeted");
  learned.expresses("greeted", "hello");

  learned.effect("greeted", "stop", "alarmed");
  learned.effect("alarmed", "that", "alarmed");
  learned.expresses("alarmed", "back-off");

  learned.effect("idle", UNKNOWN, "puzzled");
  learned.effect("greeted", UNKNOWN, "puzzled");
  learned.expresses("puzzled", "what");

  // `text` is recognised and moves nothing. One row per state — SPEC.md §8.
  for (const state of [...learned.states]) learned.effect(state, "text", state);

  // `idle` is left with no expression, so it is silent.
  return learned;
}
