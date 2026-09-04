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
