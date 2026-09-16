import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

const { brain, forget, serialize } = openBrain("sqlite::memory:");
async function fresh(...said) {
  await forget();
  for (const s of said) await brain(s);
  return serialize();
}
const says = async (q) => (await brain(q)).expression.state.says;

test("several of a kind are a group, and one thing is a node", async () => {
  const graph = await fresh("sam has 5 books");
  assert(/g1  book  type: book\[\d+\]\s+× 5/.test(graph), graph);
  assert(/n1  sam/.test(graph), graph);
  assert(!/n\d  book/.test(graph), `the books are not a thing:\n${graph}`);
});

test("what is drawn out of a group says which group it came from", async () => {
  const graph = await fresh("sam has 5 books", "sam gives 2 books to jerry");
  assert(/g2  book  type: book\[\d+\]  of g1  × 2/.test(graph), graph);
});

test("a doing names the group and does not count it again", async () => {
  const graph = await fresh("sam has 5 books", "sam gives 2 books to jerry");
  assert(/transfer\(n1, from: —, to: n2\)\s+\{time: done, thing: g2\}/.test(graph), graph);
});

test("what each of them holds still reads", async () => {
  await fresh("sam has 5 books", "sam gives 2 books to jerry");
  assertEquals(await says("how many books does sam have?"), "three");
  assertEquals(await says("how many books does jerry have?"), "two");
});

test("one of a group is a thing drawn out of it, and the group still says how many", async () => {
  const graph = await fresh(
    "a basket has five fruits",
    "one fruit is an apple",
    "another fruit is a mango",
  );
  assert(/g1  fruit  type: fruit\[\d+\]\s+× 5/.test(graph), graph);
  assert(/n2  fruit  type: fruit\[\d+\]  of g1/.test(graph), `the apple is one of the five:\n${graph}`);
  assert(/n3  fruit  type: fruit\[\d+\]  of g1/.test(graph), `and so is the mango:\n${graph}`);
  assert(/f2  kind\(n2, apple\[\d+\]\)/.test(graph), graph);
  assert(/f3  kind\(n3, mango\[\d+\]\)/.test(graph), graph);
  // Two were singled out of five, not added to them.
  assertEquals(await says("how many fruits does the basket have?"), "five");
});

test("a kind claim about a kind nothing was counted of is still a cycle", async () => {
  await forget();
  assertEquals((await brain("a fruit is an apple")).expression.state.says, "No. ❌");
});
