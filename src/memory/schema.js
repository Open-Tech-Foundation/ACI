/**
 * The vocabulary of the graph itself.
 *
 * Node and edge types are closed sets, and every traversal in the engine names
 * one of these constants rather than a string literal — a typo in a literal
 * would silently return zero neighbours and look like "the model didn't know
 * that", which is the single hardest class of bug to see in a symbolic system.
 */

export const NodeType = Object.freeze({
  LANGUAGE: "language",
  WORD: "word",
  CONCEPT: "concept",
  EMOTION: "emotion",
  TEMPLATE: "template",
});

export const EdgeType = Object.freeze({
  /** word -> language */
  IN_LANGUAGE: "in_language",
  /** word -> concept: what the word is understood to mean */
  DENOTES: "denotes",
  /** concept -> emotion: the affect the concept carries */
  EVOKES: "evokes",
  /** concept -> template: how the engine may answer it */
  RESPONDS_WITH: "responds_with",
  /** word -> word */
  SYNONYM_OF: "synonym_of",
  /** concept -> concept: taxonomy, e.g. greeting is-a social_act */
  IS_A: "is_a",
});

export const ids = Object.freeze({
  language: (code) => `language:${code}`,
  concept: (name) => `concept:${name}`,
  emotion: (name) => `emotion:${name}`,
  word: (language, normalized) => `word:${language}:${normalized}`,
  template: (concept, ordinal) => `template:${concept}:${ordinal}`,
});
