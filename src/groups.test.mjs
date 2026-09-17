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

test("what somebody holds is the group, said once", async () => {
  const graph = await fresh("sam has 5 books");
  assert(/f1  holding\(n1, g1\)$/m.test(graph), `the group is what he holds:\n${graph}`);
  assert(!/count: 5/.test(graph), `and how many is said on it alone:\n${graph}`);
});

test("a group answers for its kind beside any one of it", async () => {
  await fresh("dev has 3 kettles", "mira has 1 kettle");
  assertEquals(await says("who has kettles?"), "dev, mira");
});

test("what somebody is said to hold is theirs, not drawn from another's", async () => {
  const graph = await fresh("dev has 3 kettles", "mira has 1 kettle");
  assert(/n3  kettle  type: kettle\[\d+\]$/m.test(graph), `mira's is no one of dev's:\n${graph}`);
});

test("what a doing moved is drawn from what the doer had", async () => {
  const graph = await fresh("sam has 5 books", "sam gives 2 books to jerry");
  assert(/g2  book  type: book\[\d+\]  of g1  × 2/.test(graph), graph);
});

test("every end of a doing that was counted names a group", async () => {
  const graph = await fresh("sam bought 3 apples from 2 shops");
  assert(/g1  apple  type: apple\[\d+\]\s+× 3/.test(graph), graph);
  assert(/g2  shop  type: shop\[\d+\]\s+× 2/.test(graph), graph);
  assert(/transfer\(n1, from: g2, to: —\)\s+\{time: done, thing: g1\}/.test(graph), graph);
  assert(!/count:/.test(graph), `no number is said twice:\n${graph}`);
});

test("the smaller group is drawn from the bigger, whichever was said first", async () => {
  const graph = await fresh("john has 5 apples and he put three apples into a basket");
  assert(/g1  apple  type: apple\[\d+\]  of g2  × 3/.test(graph), `three out of five:\n${graph}`);
  assert(/g2  apple  type: apple\[\d+\]\s+× 5/.test(graph), graph);
});

test("what somebody was told to hold came out of nobody", async () => {
  // Two holders, one kind, and neither group was drawn from the other: priya's
  // six lanterns are not six of anybody's, and kabir's three are not three of
  // priya's, however alike the two are. Nobody said they were.
  const graph = await fresh("priya has 6 lanterns", "kabir has 3 lanterns");
  assert(/g1  lantern  type: lantern\[\d+\]\s+× 6/.test(graph), graph);
  assert(/g2  lantern  type: lantern\[\d+\]\s+× 3/.test(graph), graph);
  assert(!/of g\d/.test(graph), `neither came out of the other:\n${graph}`);
});

test("everyone the question names on the holder's side is counted", async () => {
  await fresh("priya has 6 lanterns", "kabir has 3 lanterns");
  assertEquals(await says("how many lanterns do priya and kabir have?"), "nine");
  // And each of them still answers for themselves.
  assertEquals(await says("how many lanterns does priya have?"), "six");
  assertEquals(await says("how many lanterns does kabir have?"), "three");
});

test("a third holder joins the same count", async () => {
  await fresh("priya has 6 lanterns", "kabir has 3 lanterns", "nila has 2 lanterns");
  assertEquals(await says("how many lanterns do priya, kabir and nila have?"), "eleven");
});

test("a holding reaches the one the signal made, not the kind", async () => {
  // `ravi has a red ball` is one ball, and that is the ball held. It was
  // reaching the kind instead, so the red sat on a ball nobody held and the
  // ball ravi held had no colour.
  const graph = await fresh("ravi has a red ball");
  assert(/n\d  ball  type: ball\[\d+\]  \{colour: red\[\d+\]\}/.test(graph), graph);
  assert(/f1  holding\(n1, n2\)/.test(graph), `held the one it made:\n${graph}`);
  assert(!/holding\(n1, ball\[/.test(graph), `and not the kind:\n${graph}`);
});

test("one spoken of as new is one of its own", async () => {
  // A second `a ball` is a second ball. The conversation held one node for a
  // kind, so the two of them came out as one ball that two people held and
  // that was somehow both red and blue.
  const graph = await fresh("ravi has a red ball", "kumar has a blue ball");
  assert(/f1  holding\(n1, n2\)/.test(graph), graph);
  assert(/f3  holding\(n3, n4\)/.test(graph), `a ball of his own:\n${graph}`);
  assert(/f2  property\(n2, red\[\d+\]\)/.test(graph), graph);
  assert(/f4  property\(n4, blue\[\d+\]\)/.test(graph), `and it is blue:\n${graph}`);
});
