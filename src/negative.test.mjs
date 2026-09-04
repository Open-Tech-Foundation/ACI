import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");

async function fresh(...said) {
  await forget();
  let last;
  for (const s of said) last = await brain(s);
  return last;
}

test("a sign written against a number is part of it", async () => {
  // think() reads the words side by side and takes the two as one, so nothing
  // after it sees an operation with nothing to work on.
  assertEquals((await fresh("-500 + 700")).expression.state.says, "200");
  assertEquals((await fresh("3 * -4")).expression.state.says, "-12");
  await forget();
});

test("a sign with something to take from is still taking away", async () => {
  assertEquals((await fresh("0 - 500")).expression.state.says, "-500");
  assertEquals((await fresh("5 - 2")).expression.state.says, "3");
  await forget();
});

test("a word for taking away stands before what it takes, and is not part of it", async () => {
  await forget();
  await brain("a bucket holds three nail");
  await brain("subtract one nail from it");
  assertEquals((await brain("it holds how many nails?")).expression.state.says, "two",
    "it took one, and did not read minus one");
  await forget();
});

test("a name may be given a number below nothing", async () => {
  assertEquals((await fresh("x is -500", "x < 0?")).expression.name, "affirm");
  assertEquals((await fresh("x is -500", "x > -600?")).expression.name, "affirm");
  assertEquals((await fresh("x is -500", "x > 0?")).expression.name, "deny");
  await forget();
});

test("a name may be given an amount the world never named", async () => {
  // No term names five hundred, and the name holds it all the same.
  assertEquals((await fresh("y is 500", "y > 100?")).expression.name, "affirm");
  assertEquals((await fresh("y is 5.5", "y > 5?")).expression.name, "affirm");
  await forget();
});
