/**
 * ACI's public surface — Layer 0 (SPEC.md §2, §3).
 *
 * Four atoms, three steps, three memories. Anything not re-exported here is
 * internal.
 */

export { createACI } from "./aci.js";
export { createBrain, understand, think, solve } from "./brain.js";
export { Learned, ConflictError, UNKNOWN } from "./memory/learned.js";
export { Experience } from "./memory/experience.js";
export { trainExample } from "./train/example.js";
