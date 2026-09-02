/**
 * The vocabulary index: normalized text in, known-word ids out.
 *
 * Two stages, because scoring every alias against every input would grow with
 * the vocabulary. A trigram inverted index proposes a small candidate set, and
 * only those candidates are actually scored. Short terms skip the index — a
 * two-letter word has no trigrams — and fall back to a full scan, which is
 * cheap precisely because such terms are rare.
 */

import { normalize } from "../text/normalize.js";
import { jaroWinkler, levenshteinRatio } from "./distance.js";
import { soundex } from "./phonetic.js";

/** Below this length a term has too few trigrams for the index to help. */
const INDEX_MIN_LENGTH = 4;

/** How much a phonetic collision may lift a score it did not earn. */
const PHONETIC_BONUS = 0.08;

function trigrams(text) {
  const padded = ` ${text} `;
  const grams = [];
  for (let i = 0; i + 3 <= padded.length; i++) grams.push(padded.slice(i, i + 3));
  return grams;
}

/**
 * Blends the two metrics into one score, then lets phonetics nudge it.
 *
 * The 60/40 split favours Jaro-Winkler because prefix-preserving typos are the
 * common case in typed conversation, while edit distance is kept in the mix to
 * stop short unrelated words from scoring well on a shared first letter.
 */
export function similarity(a, b) {
  if (a === b) return { score: 1, method: "exact" };

  const blended = 0.6 * jaroWinkler(a, b) + 0.4 * levenshteinRatio(a, b);
  const keyA = soundex(a);
  if (keyA !== "" && keyA === soundex(b)) {
    return { score: Math.min(1, blended + PHONETIC_BONUS), method: "phonetic" };
  }
  return { score: blended, method: "fuzzy" };
}

export class FuzzyMatcher {
  /** @param {{ threshold?: number }} options minimum score to count as a match */
  constructor({ threshold = 0.82 } = {}) {
    this.threshold = threshold;
    /** normalized alias -> Set of caller keys (an alias may serve several words) */
    this.aliases = new Map();
    /** trigram -> Set of aliases containing it */
    this.index = new Map();
    /** soundex key -> Set of aliases that sound like it */
    this.phonetic = new Map();
  }

  get size() {
    return this.aliases.size;
  }

  /** Registers one spelling of one thing. Safe to call repeatedly. */
  add(alias, key) {
    const term = normalize(alias);
    if (term.length === 0) return;

    let keys = this.aliases.get(term);
    if (!keys) {
      keys = new Set();
      this.aliases.set(term, keys);

      for (const gram of trigrams(term)) {
        let bucket = this.index.get(gram);
        if (!bucket) this.index.set(gram, (bucket = new Set()));
        bucket.add(term);
      }

      const sound = soundex(term);
      if (sound !== "") {
        let bucket = this.phonetic.get(sound);
        if (!bucket) this.phonetic.set(sound, (bucket = new Set()));
        bucket.add(term);
      }
    }
    keys.add(key);
  }

  /** The aliases worth scoring against this term. */
  candidates(term) {
    if (term.length < INDEX_MIN_LENGTH) return this.aliases.keys();

    const pool = new Set(this.phonetic.get(soundex(term)) ?? []);
    for (const gram of trigrams(term)) {
      const bucket = this.index.get(gram);
      if (!bucket) continue;
      for (const alias of bucket) pool.add(alias);
    }
    // Nothing shared a trigram or a sound: the index cannot rule anything in,
    // so it must not rule everything out.
    return pool.size > 0 ? pool : this.aliases.keys();
  }

  /**
   * Scores the term against the vocabulary.
   * @returns {Array<{key: unknown, alias: string, score: number, method: string}>}
   *   matches at or above the threshold, best first.
   */
  match(term, { threshold = this.threshold, limit = 5 } = {}) {
    const needle = normalize(term);
    if (needle.length === 0) return [];

    const exact = this.aliases.get(needle);
    if (exact) {
      return [...exact].slice(0, limit).map((key) => ({ key, alias: needle, score: 1, method: "exact" }));
    }

    const results = [];
    for (const alias of this.candidates(needle)) {
      const { score, method } = similarity(needle, alias);
      if (score < threshold) continue;
      for (const key of this.aliases.get(alias)) results.push({ key, alias, score, method });
    }

    results.sort((a, b) => b.score - a.score || a.alias.length - b.alias.length);
    return results.slice(0, limit);
  }
}
