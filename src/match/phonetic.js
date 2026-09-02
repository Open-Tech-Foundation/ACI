/**
 * Soundex, for input that was typed by ear rather than by spelling.
 *
 * It is deliberately crude — four characters, English consonant classes — and
 * is never used alone. The matcher treats a phonetic collision as a nudge on
 * top of an edit-distance score, never as a match in its own right, because
 * on four characters the false-positive rate is far too high to trust.
 */

const CODES = {
  b: "1", f: "1", p: "1", v: "1",
  c: "2", g: "2", j: "2", k: "2", q: "2", s: "2", x: "2", z: "2",
  d: "3", t: "3",
  l: "4",
  m: "5", n: "5",
  r: "6",
};

/** Soundex key for a word, or "" when there are no usable letters. */
export function soundex(word) {
  const letters = String(word).toLowerCase().replace(/[^a-z]/g, "");
  if (letters.length === 0) return "";

  let out = letters[0].toUpperCase();
  let previous = CODES[letters[0]] ?? "";

  for (let i = 1; i < letters.length && out.length < 4; i++) {
    const letter = letters[i];
    const code = CODES[letter] ?? "";
    if (code !== "" && code !== previous) out += code;
    // h and w are transparent: they do not break a run of the same code.
    if (letter !== "h" && letter !== "w") previous = code;
  }

  return out.padEnd(4, "0");
}
