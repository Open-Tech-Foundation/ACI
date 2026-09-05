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

test("asking names nothing, with or without a question mark", async () => {
  // `telescope` is no word and no term. Asked, it is not a name being given:
  // the brain answers what it found and takes nothing in.
  const r = await fresh("the man saw the boy with the telescope", "who has the telescope");
  assertEquals(r.expression.state.says, "none");
  assertEquals(r.learned, null, "a question teaches nothing");
  assertEquals((await fresh("who has the telescope?")).expression.state.says, "none");
  await forget();
});

test("a choice joined by or is answered with the one it comes out for", async () => {
  // `or` joins as a choice, not a togetherness: one of them is the answer.
  // Each pairing is worked the way any comparison is.
  assertEquals((await fresh("which is smaller 8 or 0")).expression.state.says, "zero");
  assertEquals((await fresh("which is bigger 8 or 0")).expression.state.says, "eight");
  assertEquals((await fresh("what is smaller 8 or 0")).expression.state.says, "zero");
  const tied = await fresh("which is smaller 8 or 8");
  assertEquals(tied.learned, null, "a tie teaches nothing either");
  assertEquals(tied.expression.state.says, "neither", "a worked tie is neither of them");
  await forget();
});

test("a choice may be measured things, not only numbers", async () => {
  await forget();
  await brain("alice measures 2 metre", { from: PERSON });
  await brain("bob measures 1 metre", { from: PERSON });
  assertEquals((await brain("which is bigger alice or bob", { from: PERSON })).expression.state.says, "alice");
  await forget();
});

test("what was told of one doing is not told of another", async () => {
  const r = await fresh("a boy kicked the ball", "a man kicked the stone", "who kicked the stone");
  assertEquals(r.expression.state.says, "man");
  await forget();
});

test("a greeting before a signal is said alongside it, not in it", async () => {
  await forget();
  const r = await brain("hello, how are you?", { from: PERSON });
  assertEquals(r.expression.name, "greet");
  assert(r.expression.state.says.startsWith("Hello!"), "greeted");
  assert(r.expression.branch.length > 1, "and the rest answered on its own");
  await forget();
});

test("one greeting after another is two greetings, not a greeting and a signal", async () => {
  await forget();
  assertEquals((await brain("hi hi")).expression.name, "learn");
  await forget();
});

test("how asks after the way a thing is, not what it is", async () => {
  await forget();
  // The brain holds no state of its own, so there is none to give — which is
  // not the same as not knowing.
  assertEquals((await brain("how are you?", { from: PERSON })).expression.state.says, "none");
  assertEquals((await brain("what are you")).expression.state.says, "computer");
  await forget();
});

test("a signal may turn its joint to the front", async () => {
  await forget();
  assertEquals((await brain("is a cat an animal?")).expression.name, "affirm");
  assertEquals((await brain("is a cat a fish?")).expression.name, "deny");
  assertEquals((await brain("is 10 greater than 2?")).expression.name, "affirm");
  await forget();
});

test("an operation standing before what it takes is a doing, not a joint", async () => {
  await forget();
  await brain("a basket holds three apple");
  assertEquals((await brain("add one apple into it", { from: PERSON })).expression.name, "learn");
  assertEquals((await brain("it holds how many apples?")).expression.state.says, "four");
  await forget();
});
