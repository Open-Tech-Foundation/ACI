/** Layer 0. No training and no vocabulary: the model ships knowing nothing. */

export { createACI } from "./aci.js";
export { audit, meaningOf, reachable } from "./audit.js";
export { atomsOf, receive } from "./receive.js";
export { createBrain, understand, think, solve } from "./brain.js";
export { Learned, ConflictError, UNKNOWN } from "./memory/learned.js";
export { Experience } from "./memory/experience.js";
export { learnedFrom } from "./memory/lesson.js";
