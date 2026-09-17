import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");

const told = async (said) => (await brain(said)).expression.name;

test("a thing may be more than one kind of thing", async () => {
  await forget();
  // Every kind of object was held apart from every other, which said that a
  // cup cannot be a container because it is a tool. It is both.
  for (const said of [
    "a cup is a container",
    "a bottle is a container",
    "a bucket is a container",
    "a bag is a container",
    "a phone is a device",
    "a clock is a device",
    "a lamp is a device",
  ]) {
    const name = await told(said);
    assertEquals(name === "learn" || name === "know", true, `${said}: ${name}`);
  }
  await forget();
});

test("what the world holds apart it still denies", async () => {
  await forget();
  assertEquals(await told("is a cup an organism?"), "deny");
  assertEquals(await told("is a wren a fish?"), "deny");
  assertEquals(await told("is a dog a plant?"), "deny");
  await forget();
});

test("and what it holds apart from nothing it does not", async () => {
  await forget();
  // Not being told a cup is no vehicle is not being told it is not one.
  assertEquals(await told("is a cup a vehicle?"), "unsure");
  await forget();
});

test("kinds of a thing are the kinds, narrowed to it", async () => {
  // `kinds of thing` is not a kind holding a thing: the far side of the joint
  // says which kinds are asked after. The phrase was read as a holding and
  // came back unknown, where the same question without it answered.
  await forget();
  await brain("a rack has 3 kites and 6 ropes");
  assertEquals((await brain("how many kinds does the rack have?")).expression.state.says, "two");
  assertEquals((await brain("how many kinds of thing does the rack have?")).expression.state.says, "two");
  assertEquals((await brain("how many kinds of rope does the rack have?")).expression.state.says, "one");
  // And what it holds is still counted whole.
  assertEquals((await brain("how many things does the rack have?")).expression.state.says, "nine");
  await forget();
});

test("being one way is not being no other way", async () => {
  // Every quality was declared to hold every other apart, so a cake that was
  // sweet was not good and a stone that was rough was not hard. What holds
  // apart is a pair of opposites, and the world says which pairs those are.
  await forget();
  await brain("a cake is sweet");
  assertEquals((await brain("is a cake good?")).expression.name, "unsure");
  await forget();
  await brain("a stone is rough");
  assertEquals((await brain("is a stone hard?")).expression.name, "unsure");
  assertEquals((await brain("is a stone smooth?")).expression.name, "deny");
  await forget();
});

test("a word for one way of being is not the word for being some way at all", async () => {
  // `rough` was written as the term every quality is one of, so the brain
  // answered `a river is property` — true of everything and an answer to
  // nothing.
  await forget();
  await brain("the river is rough");
  assertEquals((await brain("is the river rough?")).expression.state.says, "Yes. ✅ a river is rough.");
  await forget();
});
