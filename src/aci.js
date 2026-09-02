/**
 * The model's front door — SPEC.md §3.1.
 *
 * Everything else in `src/` is how it works today. This is what it *does*, and
 * it is deliberately one thing: you send it what arrived, it answers.
 *
 *   const aci = createACI();
 *
 *   aci({ signal: "touch", place: "shoulder" });
 *   // -> { express: "feel" }
 *
 *   aci({ signal: "text", message: "hey stop that" });
 *   // -> { express: "back-off" }
 *
 *   aci({ signal: "touch", place: "shoulder" }, { signal: "text", message: "hey" });
 *   // one turn, both inputs, in the order given
 *
 * Nothing here exposes a state name, a table, a walk or an atom, so the
 * behaviour tests in `spec/` stay true no matter how the inside is rebuilt.
 *
 * A session is one brain. Its state carries from call to call — that is not an
 * implementation detail, it is the whole reason two identical inputs can come
 * out differently. Start a new session for a brain that has had nothing happen
 * to it yet.
 */

import { createBrain } from "./brain.js";
import { Experience } from "./memory/experience.js";
import { Learned } from "./memory/learned.js";
import { receive } from "./receive.js";
import { trainExample } from "./train/example.js";

/**
 * @param teach  receives an empty learned memory and teaches it. Defaults to
 *               the specification's worked examples.
 */
export function createACI({ teach = trainExample } = {}) {
  const learned = teach(new Learned());
  const brain = createBrain({ learned, experience: new Experience() });

  /**
   * One turn. `{ express }` is what it has to say — `null` for silence, which
   * is a real answer and not a failure.
   */
  return (...inputs) => ({ express: brain.sense(receive(inputs)).express });
}
