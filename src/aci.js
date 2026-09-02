/** The front door. Send what arrived; it answers. SPEC.md §3.1. */

import { createBrain } from "./brain.js";
import { Experience } from "./memory/experience.js";
import { Learned } from "./memory/learned.js";
import { receive } from "./receive.js";

/** Training is required. The model knows nothing until it is taught. */
export function createACI({ teach } = {}) {
  if (typeof teach !== "function") {
    throw new Error("a model needs training: createACI({ teach })");
  }

  const brain = createBrain({
    learned: teach(new Learned()),
    experience: new Experience(),
  });

  return (...inputs) => ({ express: brain.sense(receive(inputs)).express });
}
