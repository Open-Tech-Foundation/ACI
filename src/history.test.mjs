import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");
const says = async (said) => (await brain(said)).expression.state.says;

test("asked on the past side of now, the brain reads what was so then", async () => {
  await forget();
  await brain("a crate holds six lamp");
  await brain("take two lamps from the crate");
  assertEquals(await says("the crate holds how many lamps?"), "four");
  assertEquals(await says("the crate held how many lamps?"), "six");
  await forget();
});

test("it steps back one stamp at a time, however often the state moved", async () => {
  await forget();
  await brain("a crate holds six lamp");
  await brain("take two lamps from the crate");
  await brain("give five lamps to the crate");
  assertEquals(await says("the crate holds how many lamps?"), "nine");
  assertEquals(await says("the crate held how many lamps?"), "four", "what was so before the giving");
  await forget();
});

test("a state that never moved has no before", async () => {
  await forget();
  await brain("a crate holds six lamp");
  assertEquals(await says("the crate holds how many lamps?"), "six");
  assertEquals((await brain("the crate held how many lamps?")).expression.name, "unsure",
    "nothing was so before it");
  await forget();
});

test("what was so before is not remembered on purpose — it was never written over", async () => {
  await forget();
  const told = await brain("a crate holds six lamp");
  const stamped = told.learned.terms.flatMap((t) => t.links).find((l) => l.quantity === 6);
  assert(Number.isInteger(stamped.at), "every count is stamped, and that is the whole of it");
  await forget();
});

test("a count needs no term for its number", async () => {
  await forget();
  // No word names a thousand, and a pond of a thousand stones keeps its count
  // all the same.
  await brain("a pond has 1000 stones");
  assertEquals(await says("the pond has how many stones?"), "1000");
  await forget();
});

test("asked how many with nothing said of whose, it is what was last spoken of", async () => {
  await forget();
  await brain("a pond has 1000 stones");
  assertEquals(await says("how many stones?"), "1000");
  // And where it holds none of them, it is still the world being counted.
  assertEquals(await says("how many amphibian?"), "four");
  await forget();
});

test("the count sits on whichever end holds it", async () => {
  await forget();
  await brain("a pond holds 1000 stones");
  assertEquals(await says("how many stones in the pond?"), "1000",
    "being in a thing and its holding you are one fact");
  await forget();
});

test("what a thing holds is counted across the kinds it holds", async () => {
  await forget();
  // Nothing says a shop holds *things*. It holds bats and balls, and those
  // are things.
  await brain("a shop has 5 bats and two balls");
  assertEquals(await says("how many bats"), "five");
  assertEquals(await says("how many balls"), "two");
  assertEquals(await says("how many things"), "seven");
  assertEquals(await says("the shop has how many things?"), "seven");
  await forget();
});

test("a kind is counted by everything that is one of it", async () => {
  await forget();
  await brain("a shop has 5 bats and two balls");
  assertEquals(await says("how many shop"), "one", "the one that was made counts");
  await forget();
});

test("asked after several kinds at once, the count is all of them together", async () => {
  await forget();
  await brain("a family has two sisters and one brother");
  assertEquals(await says("how many sisters"), "two");
  assertEquals(await says("how many brothers"), "one");
  assertEquals(await says("how many brothers and sisters"), "three");
  assertEquals(await says("how many humans"), "three", "and a kind that covers both");
  await forget();
});
