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

test("asked how a thing stands on a scale, what answers is what it measures", async () => {
  await forget();
  await brain("the rope is 2 metres long");
  assertEquals(
    (await brain("how long is the rope?")).expression.state.says,
    "two metres",
    "two of nothing is no length",
  );
  await brain("the rope weighs 3 kilograms");
  assertEquals(
    (await brain("how heavy is the rope?")).expression.state.says,
    "three kilograms",
    "the scale asked on picks which measurement answers",
  );
  await forget();
});

test("nothing measured on the scale asked leaves the question unanswered", async () => {
  await forget();
  // A rope is a tool, and that is a true answer to a question nobody asked.
  await brain("a rope is a tool");
  assertEquals((await brain("how long is the rope?")).expression.name, "unsure");
  await forget();
});

test("what the question did not name, the answer says", async () => {
  await forget();
  await brain("the mast is 6 metres long");
  assertEquals(
    (await brain("how long is the mast?")).expression.state.says,
    "six metres",
    "six of nothing is no length",
  );
  await brain("the plank is 1 metre long");
  assertEquals((await brain("how long is the plank?")).expression.state.says, "one metre");
  await forget();
});

test("measured in one unit, asked for in another", async () => {
  await forget();
  await brain("the crate weighs 5 kilograms");
  // The world says a kilogram is a thousand grams; nothing else is written.
  assertEquals((await brain("how many grams does the crate weigh?")).expression.state.says, "5000");
  assertEquals((await brain("how many kilograms does the crate weigh?")).expression.state.says, "5");
  await forget();
  await brain("a shelf holds 4 stamps");
  assertEquals(
    (await brain("how many grams does the shelf hold?")).expression.name,
    "unsure",
    "nothing weighed it",
  );
  await forget();
});
