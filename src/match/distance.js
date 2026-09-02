/**
 * String distance metrics, chosen for short conversational input.
 *
 * Levenshtein and Jaro-Winkler disagree in useful ways: edit distance is
 * unforgiving about length ("hi" vs "hello" is far, as it should be), while
 * Jaro-Winkler rewards a shared prefix, which is where real typos live
 * ("helo", "thnaks"). The matcher blends both rather than trusting either.
 */

/** Levenshtein edit distance, two-row so memory stays O(min(a,b)). */
export function levenshtein(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = new Array(b.length + 1);
  let cur = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    const swap = prev;
    prev = cur;
    cur = swap;
  }
  return prev[b.length];
}

/** Edit distance rescaled to 0..1, where 1 is identical. */
export function levenshteinRatio(a, b) {
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 1;
  return 1 - levenshtein(a, b) / longest;
}

/** Jaro similarity: matches within a sliding window, penalized by transpositions. */
export function jaro(a, b) {
  if (a === b) return 1;
  const la = a.length;
  const lb = b.length;
  if (la === 0 || lb === 0) return 0;

  const window = Math.max(0, Math.floor(Math.max(la, lb) / 2) - 1);
  const aMatched = new Array(la).fill(false);
  const bMatched = new Array(lb).fill(false);

  let matches = 0;
  for (let i = 0; i < la; i++) {
    const start = Math.max(0, i - window);
    const end = Math.min(i + window + 1, lb);
    for (let j = start; j < end; j++) {
      if (bMatched[j] || a[i] !== b[j]) continue;
      aMatched[i] = true;
      bMatched[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < la; i++) {
    if (!aMatched[i]) continue;
    while (!bMatched[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  transpositions /= 2;

  return (matches / la + matches / lb + (matches - transpositions) / matches) / 3;
}

/**
 * Jaro-Winkler: Jaro, with a bonus for a common prefix.
 *
 * The bonus only applies above 0.7 — below that the strings are unrelated and a
 * shared first letter is coincidence, not evidence.
 */
export function jaroWinkler(a, b, scale = 0.1) {
  const score = jaro(a, b);
  if (score < 0.7) return score;
  const limit = Math.min(4, a.length, b.length);
  let prefix = 0;
  while (prefix < limit && a[prefix] === b[prefix]) prefix++;
  return score + prefix * scale * (1 - score);
}
