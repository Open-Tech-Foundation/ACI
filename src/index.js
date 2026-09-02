/**
 * ACI's public surface.
 *
 * Anything not re-exported here is internal and may be renamed or removed
 * without a major version, because nothing outside the package could have
 * imported it.
 */

export { createBrain, understand, think, solve } from "./brain.js";
export { createEnvelope, isEnvelope, ENVELOPE_VERSION } from "./envelope.js";
export { Memory } from "./memory/memory.js";
export { createMemory, seedEnglish } from "./memory/seed.js";
export { EdgeType, NodeType, ids } from "./memory/schema.js";
export { RuleEngine, matches } from "./rules/engine.js";
export { coreRules } from "./rules/core-rules.js";
export { FuzzyMatcher, similarity } from "./match/fuzzy.js";
export { jaro, jaroWinkler, levenshtein, levenshteinRatio } from "./match/distance.js";
export { soundex } from "./match/phonetic.js";
export { normalize, tokenize } from "./text/normalize.js";
export { Trace } from "./trace.js";
