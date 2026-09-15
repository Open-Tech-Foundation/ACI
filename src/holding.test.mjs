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
  await brain("a basket holds three apple");
  await brain("it holds five apple");
  // The later holding stands after the earlier one rather than erasing it:
  // asked now, it answers now, and what was so before is still on the record
  // for a question that asks after it. Which links carry the stamps is the
  // memory's own business.
  assertEquals((await brain("it holds how many apples?")).expression.state.says, "five");
  assertEquals(
    (await brain("how many apples did it hold?")).expression.state.says,
    "three",
    "what was so before is not written over",
  );
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
  assertEquals((await brain("add one apple into it")).expression.name, "learn",
    "told what was done, it takes it in rather than reading the number back");
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
  await brain("subtract one apple from it");
  assertEquals((await brain("it holds how many apples?")).expression.state.says, "two");
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
  await brain("i take one nail from the bucket", { from: 29 });
  assertEquals((await brain("the bucket has how many nails?")).expression.state.says, "two");
  await forget();
});

test("what a thing has answers out of what it was told to have", async () => {
  await forget();
  // A hold the conversation told of sits on the thing the brain made for the
  // holder, never on the authored kind; asking what the holder has still reads
  // it out. The kind's own links answer nothing — the bearer does.
  await brain("the basket has three apple");
  const r = await brain("what does the basket have?");
  assertEquals(r.expression.name, "answer");
  assertEquals(r.expression.state.says, "apple");
  await forget();
});

test("what a thing has answers each kind it was told to have", async () => {
  await forget();
  await brain("the box has two balls and a rope");
  assertEquals((await brain("what does the box have?")).expression.state.says, "rope, ball");
  await forget();
});

test("a person's hold is answered the same way", async () => {
  await forget();
  await brain("sam has a book");
  assertEquals((await brain("what does sam have?")).expression.state.says, "book");
  await forget();
});

test("a count of a thing is never negative", async () => {
  await forget();
  // Holding five is holding five; minus five of them is no state the world
  // holds, and a static count below zero is refused where it is told.
  assertEquals((await brain("sam has -2 apples")).expression.name, "deny");
  await forget();
});

test("zero and a positive count are still holds", async () => {
  await forget();
  await brain("sam has 2 apples");
  assertEquals((await brain("how many apples does sam have?")).expression.state.says, "two");
  await forget();
  await brain("sam has 0 apples");
  assertEquals((await brain("how many apples does sam have?")).expression.state.says, "zero");
  await forget();
});

test("a counting hold answers for its bearer and is asked after the kind", async () => {
  await forget();
  // The count sits on the bearer the brain made, and the apple it holds is one
  // thing of the apple kind — so asked of the kind, the bearer answers: is
  // there any, it affirms, and whoever holds the one holds the kind.
  await brain("the basket has three apple");
  assertEquals((await brain("does the basket have apples?")).expression.name, "affirm",
    "a count of a kind is a hold of it");
  assertEquals((await brain("does the basket have any apples?")).expression.name, "affirm");
  assertEquals((await brain("what has apples?")).expression.name, "answer",
    "whoever holds the thing of the kind holds the kind");
  await forget();
});
