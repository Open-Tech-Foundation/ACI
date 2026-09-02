/**
 * The model's front door.
 *
 * Everything else in `src/` is how it works today. This is what it *does*, and
 * it is deliberately one thing: you send it something, it answers. Nothing
 * here leaks a state name, a table, a walk or a step, so the behaviour tests
 * in `spec/` stay true no matter how Layer 0 is rebuilt underneath them.
 *
 *   const aci = createACI();
 *   aci("touch");            // -> "feel"
 *   aci(["hey", "stop"]);    // -> "back-off"
 *
 * A session is one brain. Its state carries from call to call — that is not an
 * implementation detail, it is the whole reason two identical inputs can come
 * out differently. Start a new session for a brain that has had nothing happen
 * to it yet.
 */

import { createBrain } from "./brain.js";
import { Experience } from "./memory/experience.js";
import { Learned } from "./memory/learned.js";
import { trainExample } from "./train/example.js";

/**
 * @param teach  receives an empty learned memory and teaches it. Defaults to
 *               the specification's worked examples.
 */
export function createACI({ teach = trainExample } = {}) {
  const learned = teach(new Learned());
  const brain = createBrain({ learned, experience: new Experience() });

  /** One turn in. The expression out, or `null` for silence. */
  return (input) => brain.sense(input).express;
}
