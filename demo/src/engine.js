/**
 * One brain for the page.
 *
 * The demo imports the engine directly from ../../src — there is no build step
 * between them, so what the page runs is what the tests run.
 *
 * Note what is *not* imported: src/memory/store.js. Persistence needs
 * `runtime:db`, which does not exist in a browser, and the brain does not need
 * it to think. Learned memory and experience are both in process here.
 */

import { createBrain, Experience } from "../../src/index.js";
import { illustration } from "../../fixtures/illustration.js";

export const learned = illustration();
export const experience = new Experience();
export const brain = createBrain({ learned, experience });

/** Splits a typed line into atoms. Whitespace is a separator, nothing more. */
export function atomsOf(line) {
  return line.trim().split(/\s+/).filter(Boolean);
}

/** What has been taught, for the panel that lists it. */
export function taught() {
  const rows = learned.toRows();
  return {
    start: rows.start,
    effects: rows.effects,
    expressions: rows.expressions,
    silent: rows.states.filter((state) => learned.expressionOf(state) === null),
  };
}
