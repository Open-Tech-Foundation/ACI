import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");

test("how much is not how many, and the brain says so", async () => {
  await forget();
  // An apple does not have three weights. It weighs some amount, and the brain
  // counts without being able to measure, so it does not know.
  const r = await brain("an apple has three weight");
  assertEquals(r.expression.name, "unsure");
  assertEquals(r.learned, null, "and nothing of it is taken in");
  await forget();
});

test("a number beside a property is not a thing the signal named", async () => {
  await forget();
  await brain("an apple has three weight");
  // That an apple has weight, the brain knew from the universe before anyone
  // said anything. What it refused was the count, and it did not quietly take
  // that some other way.
  assertEquals((await brain("the apple has how many weights?")).expression.name, "unsure");
  assert(
    (await brain("an apple has three?")).expression.name !== "affirm",
    "nor did the number become something an apple has three of",
  );
  await forget();
});

test("every property is the same: a size is not counted either", async () => {
  await forget();
  for (const said of ["an apple has two size", "an apple has four temperature", "a stone has five mass"]) {
    const r = await brain(said);
    assertEquals(r.expression.name, "unsure", said);
    assertEquals(r.learned, null, said);
  }
  await forget();
});

test("a number beside a thing is still how many of it there are", async () => {
  await forget();
  await brain("a cupboard has three cup");
  assertEquals((await brain("the cupboard has how many cups?")).expression.state.says, "three");
  await forget();
});

test("a number worked on is not a number beside a property", async () => {
  await forget();
  assertEquals((await brain("add 1 and 2")).expression.state.says, "3");
  assertEquals((await brain("1+8 and 5+9")).expression.state.says, "9, 14");
  assertEquals((await brain("a cat is two?")).expression.name, "deny");
  await forget();
});
