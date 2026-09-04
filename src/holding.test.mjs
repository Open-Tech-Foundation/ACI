import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");

test("a thing that holds things is one the world says holds things", async () => {
  await forget();
  assertEquals((await brain("a basket holds things?")).expression.name, "affirm");
  await forget();
});

test("a thing the world says nothing of holding is not one that holds", async () => {
  await forget();
  assertEquals((await brain("a stone holds things?")).expression.name, "unsure");
  await forget();
});

test("a thing is itself without standing in every relation to itself", async () => {
  await forget();
  // A stone climbs to `thing`, and a thing was never said to hold a thing.
  assertEquals((await brain("a stone is a thing?")).expression.name, "affirm");
  assertEquals((await brain("a stone holds a stone?")).expression.name, "unsure");
  await forget();
});

test("what a thing holds is counted, and held by the one thing holding it", async () => {
  await forget();
  await brain("a basket holds three apple");
  assertEquals((await brain("it holds how many apples?")).expression.state.says, "three");
  await forget();
});

test("what a thing holds is stamped, so it can change without erasing what was", async () => {
  await forget();
  const first = await brain("a basket holds three apple");
  const then = await brain("it holds five apple");
  const was = first.learned.terms[0].links.find((l) => l.quantity === 3);
  const now = then.learned.terms[0].links.find((l) => l.quantity === 5);
  assert(was.at < now.at, "the later holding stands after the earlier one");
  assertEquals((await brain("it holds how many apples?")).expression.state.says, "five");
  await forget();
});

test("holding is its own relation, not being and not having", async () => {
  await forget();
  await brain("a basket holds three apple");
  assertEquals((await brain("it has how many apples?")).expression.name, "unsure",
    "what it holds is not what it has");
  await forget();
});

test("what is put into a thing is what it comes to hold", async () => {
  await forget();
  await brain("a basket holds three apple");
  assertEquals((await brain("add one apple into it")).expression.state.says, "four");
  assertEquals((await brain("it holds how many apples?")).expression.state.says, "four");
  await forget();
});

test("an operation named outright is the same act as one an action causes", async () => {
  await forget();
  await brain("a basket holds three apple");
  const added = await brain("add one apple into it");
  await forget();
  await brain("a basket holds three apple");
  const gave = await brain("give one apple to it");
  assertEquals(added.expression.state.says, gave.expression.state.says);
  await forget();
});

test("nobody did an operation the signal named, so nothing happened", async () => {
  await forget();
  await brain("a basket holds three apple");
  const added = await brain("add one apple into it");
  const gave = await brain("give one apple to it");
  assertEquals((added.roots[0].branch || []).some((b) => b.kind === "event"), false);
  assert((gave.roots[0].branch || []).some((b) => b.kind === "event"), "someone gave it");
  await forget();
});

test("taking works from a source the same way", async () => {
  await forget();
  await brain("a basket holds three apple");
  assertEquals((await brain("subtract one apple from it")).expression.state.says, "two");
  await forget();
});

test("adding to a count the world never gave stays unknown", async () => {
  await forget();
  await brain("a basket holds three apple");
  const r = await brain("add one spoon into it");
  assertEquals(r.expression.name, "unsure", "holding no spoons was never said");
  assertEquals(r.learned, null);
  await forget();
});

test("a joining word still leaves arithmetic alone", async () => {
  assertEquals((await brain("add 1 and 2")).expression.state.says, "3");
});

test("what a thing has in it may have been said either way", async () => {
  await forget();
  // Told a bucket *has* three nails, taking one still takes one: whichever
  // word the count was kept under is the one that changes.
  await brain("a bucket has three nail");
  assertEquals((await brain("i take one nail from the bucket", { from: 29 })).expression.state.says, "two");
  assertEquals((await brain("the bucket has how many nails?")).expression.state.says, "two");
  await forget();
});
