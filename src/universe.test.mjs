import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");

test("everything that is, is inside the universe", async () => {
  await forget();
  assertEquals((await brain("the universe has an existence?")).expression.name, "affirm");
  assertEquals((await brain("the universe has a force?")).expression.name, "affirm");
  assertEquals((await brain("gravity is a force?")).expression.name, "affirm");
  assertEquals(
    (await brain("gravity is a force?")).expression.state.says,
    "Yes. ✅ gravity is a force.",
    "what is not one of a kind takes no article",
  );
  await forget();
});

test("what a force does, everything physical has — and nobody said so", async () => {
  await forget();
  for (const said of ["an apple has weight?", "a stone has weight?", "a cat has weight?", "a car has weight?"]) {
    assertEquals((await brain(said)).expression.name, "affirm", said);
  }
  // It was never told. It reached this from the universe inward: these are
  // physical things, the universe has gravity, and what gravity causes is weight.
  assertEquals((await brain("a stone has weight")).expression.name, "understood",
    "told it, it already knew");
  assertEquals((await brain("a stone has weight")).learned, null, "so there was nothing to take in");
  await forget();
});

test("a force reaches the physical and nothing else", async () => {
  await forget();
  for (const said of ["three has weight?", "a number has weight?", "an idea has weight?"]) {
    assertEquals((await brain(said)).expression.name, "unsure", said);
  }
  await forget();
});

test("everything a force causes reaches what it acts on, not only the one thing", async () => {
  await forget();
  // The world says gravity causes falling as well as weight.
  assertEquals((await brain("an apple has a fall?")).expression.name, "affirm");
  assertEquals((await brain("an idea has a fall?")).expression.name, "unsure");
  await forget();
});

test("what no force causes still has to be told", async () => {
  await forget();
  // Colour is a property of things, and no force the world holds causes it.
  assertEquals((await brain("an apple has a colour?")).expression.name, "unsure");
  assertEquals((await brain("an apple has a mass?")).expression.name, "unsure");
  await forget();
});

test("having a weight is not being heavy", async () => {
  await forget();
  // A force gives a thing the property. How much of it a thing has is another
  // matter, and nothing about a stone says which end of it a stone is at.
  assertEquals((await brain("a stone has weight?")).expression.name, "affirm");
  assertEquals((await brain("a stone is heavy?")).expression.name, "unsure");
  await forget();
});
