import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");
const PERSON = 29;

async function fresh(...said) {
  await forget();
  let last;
  for (const s of said) last = await brain(s, { from: PERSON });
  return last;
}

test("a hole may say what kind of answer it wants", async () => {
  // Everything the car is stays true; only a colour is an answer to this.
  assertEquals((await fresh("a car is red", "what colour is the car")).expression.state.says, "red");
  assertEquals((await fresh("what colour is the sky")).expression.state.says, "blue");
  await forget();
});

test("the kind asked after is not one of the things asked about", async () => {
  const r = await fresh("a car is red", "the car is what");
  assertEquals(r.expression.state.says, "vehicle, red", "asked plainly, it says all of it");
  await forget();
});

test("a kind nothing was said of is no answer", async () => {
  assertEquals((await fresh("a car is red", "what size is the car")).expression.state.says, "none");
  await forget();
});

test("a hole standing where something played a part asks which thing played it", async () => {
  assertEquals((await fresh("a boy kicked the ball", "who kicked the ball")).expression.state.says, "boy");
  assertEquals((await fresh("a boy kicked the ball", "the boy kicked what")).expression.state.says, "ball");
  await forget();
});

test("nothing was told to have happened, so nothing played the part", async () => {
  assertEquals((await fresh("who kicked the ball")).expression.state.says, "none");
  await forget();
});

test("what was told of one doing is not told of another", async () => {
  const r = await fresh("a boy kicked the ball", "a man kicked the stone", "who kicked the stone");
  assertEquals(r.expression.state.says, "man");
  await forget();
});
