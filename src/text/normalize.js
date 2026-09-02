/**
 * Surface text in, comparable text out.
 *
 * Everything downstream — the fuzzy index, the graph keys, the phrase
 * scanner — agrees on exactly one normal form, and this module is it. If two
 * callers normalized differently the index would silently stop matching, so
 * nothing else in the engine is allowed to lowercase or strip on its own.
 */

const COMBINING_MARKS = /[̀-ͯ]/g;
const NON_WORD = /[^\p{L}\p{N}\s']/gu;
const WHITESPACE = /\s+/g;

/** Folds text to its comparable form: unaccented, lowercase, punctuation-free. */
export function normalize(text) {
  return String(text)
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(NON_WORD, " ")
    .replace(WHITESPACE, " ")
    .trim();
}

/**
 * Splits input into tokens, keeping each token's original surface next to its
 * normalized form. The surface is what a response quotes back at the user; the
 * normalized form is what the matcher searches on.
 */
export function tokenize(text) {
  const tokens = [];
  const raw = String(text).split(/(\s+)/);
  let offset = 0;
  for (const piece of raw) {
    if (piece.length === 0) continue;
    if (!/\s/.test(piece[0])) {
      const normalized = normalize(piece);
      if (normalized.length > 0) {
        tokens.push({ surface: piece, normalized, offset, index: tokens.length });
      }
    }
    offset += piece.length;
  }
  return tokens;
}
