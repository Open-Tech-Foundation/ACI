import { assert, assertEquals, test } from "runtime:test";
import { jaro, jaroWinkler, levenshtein, levenshteinRatio } from "./distance.js";

test("levenshtein counts single edits", () => {
  assertEquals(levenshtein("hello", "helo"), 1);
  assertEquals(levenshtein("kitten", "sitting"), 3);
  assertEquals(levenshtein("", "abc"), 3);
  assertEquals(levenshtein("same", "same"), 0);
});

test("levenshteinRatio is 1 for identical and 0 for wholly different", () => {
  assertEquals(levenshteinRatio("abc", "abc"), 1);
  assertEquals(levenshteinRatio("", ""), 1);
  assertEquals(levenshteinRatio("abc", "xyz"), 0);
});

test("jaro is bounded and symmetric", () => {
  assertEquals(jaro("abc", "abc"), 1);
  assertEquals(jaro("abc", "xyz"), 0);
  assert(Math.abs(jaro("martha", "marhta") - jaro("marhta", "martha")) < 1e-12);
});

test("jaro-winkler rewards a shared prefix", () => {
  // Same edit distance, but the typo further from the start should score higher.
  assert(jaroWinkler("hello", "hellp") > jaroWinkler("hello", "jello"));
});

test("jaro-winkler withholds the prefix bonus from unrelated strings", () => {
  // Below the 0.7 gate a shared first letter is coincidence, so no bonus.
  assertEquals(jaroWinkler("hi", "hello"), jaro("hi", "hello"));
});
