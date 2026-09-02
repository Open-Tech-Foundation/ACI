import { assert, assertEquals, test } from "runtime:test";
import { FuzzyMatcher, similarity } from "./fuzzy.js";

function matcher(...aliases) {
  const m = new FuzzyMatcher();
  for (const alias of aliases) m.add(alias, alias);
  return m;
}

test("an exact match scores 1 and says so", () => {
  const { score, method } = similarity("hello", "hello");
  assertEquals(score, 1);
  assertEquals(method, "exact");
});

test("a typo still resolves to the intended word", () => {
  const m = matcher("hello", "goodbye", "thanks");
  const [best] = m.match("helo");
  assertEquals(best.key, "hello");
  assert(best.score >= 0.82);
});

test("a transposition resolves too", () => {
  const m = matcher("thanks", "hello");
  const [best] = m.match("thnaks");
  assertEquals(best.key, "thanks");
});

test("short unrelated words are not forced together", () => {
  // "hi" and "hello" share a first letter and nothing else; conflating them
  // would make every greeting collapse into one node.
  const m = matcher("hello");
  assertEquals(m.match("hi").length, 0);
});

test("nonsense matches nothing", () => {
  const m = matcher("hello", "goodbye", "thanks");
  assertEquals(m.match("qwertyuiop").length, 0);
});

test("results come back best first", () => {
  const m = matcher("hello", "hellp", "help", "goodbye");
  // Threshold off, so this exercises the ordering rather than the gate.
  const results = m.match("hellol", { threshold: 0, limit: 10 });
  assert(results.length > 1);
  assertEquals(results[0].key, "hello");
  for (let i = 1; i < results.length; i++) assert(results[i - 1].score >= results[i].score);
});

test("one alias may serve several keys", () => {
  const m = new FuzzyMatcher();
  m.add("bank", "bank:river");
  m.add("bank", "bank:money");
  assertEquals(m.match("bank").length, 2);
});

test("normalization happens on the way in as well as out", () => {
  const m = matcher("Thank You");
  assertEquals(m.match("thank you")[0].key, "Thank You");
});

test("empty input matches nothing rather than throwing", () => {
  assertEquals(matcher("hello").match("").length, 0);
  assertEquals(matcher("hello").match("!!!").length, 0);
});
