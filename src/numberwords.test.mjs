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

test("two number words side by side are one number", async () => {
  // think() reads the words together and takes them as one, so nothing after
  // it sees two numbers where there was one.
  assertEquals((await fresh("add twenty five and five")).expression.state.says, "thirty");
  assertEquals((await fresh("add one hundred twenty five and five")).expression.state.says, "130");
  await forget();
});

test("a round one and a smaller one after it are added", async () => {
  assertEquals((await fresh("twenty five more twenty?")).expression.name, "affirm");
  assertEquals((await fresh("twenty five more ninety?")).expression.name, "deny");
  await forget();
});

test("a smaller one before a round one multiplies it", async () => {
  assertEquals((await fresh("two hundred more ninety nine?")).expression.name, "affirm");
  assertEquals((await fresh("add two hundred and one")).expression.state.says, "201");
  await forget();
});

test("a number the world never named is still counted", async () => {
  await forget();
  await brain("a box holds twenty five balls");
  assertEquals((await brain("the box holds how many balls?")).expression.state.says, "25");
  await forget();
});

test("figures are already whole as written, and are not run together", async () => {
  assertEquals((await fresh("3 4")).expression.name, "unknown", "two figures are two things");
  assertEquals((await fresh("add 1 and 2")).expression.state.says, "3");
  await forget();
});

test("a number the world never named is still a number", async () => {
  assertEquals((await fresh("twenty five")).expression.name, "count");
  await forget();
});
