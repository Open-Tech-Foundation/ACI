import { test, assert, assertEquals } from "runtime:test";
import { brain, forget } from "./index.js";

const says = async (q) => (await brain(q)).expression.state.says;
const held = (r) => (r.roots[0].branch || []).find((b) => b.kind === "count");

test("a thing can hold a number of something, and the brain remembers", async () => {
  forget();
  assertEquals(await says("basket has how many apple?"), "I don't know.");
  await brain("basket has three apple");
  assertEquals(await says("basket has how many apple?"), "three");
  forget();
});

test("a different count is a change of state, not a contradiction", async () => {
  forget();
  await brain("basket has three apple");
  const r = await brain("basket has two apple");
  assert(r.learned !== null, "it takes the new count");
  assertEquals((r.roots[0].branch || []).find((b) => b.kind === "refuse"), undefined);
  assertEquals(await says("basket has how many apple?"), "two");
  forget();
});

test("the count is carried on the link, not on the thing", async () => {
  forget();
  await brain("basket has three apple");
  assertEquals(
    (await brain("basket has three apple")).learned,
    null,
    "telling it the same thing again changes nothing",
  );
  forget();
});

test("a number spent counting is not one of the things being spoken about", async () => {
  forget();
  const r = await brain("basket has three apple");
  const learn = (r.roots[0].branch || []).find((b) => b.kind === "learn");
  assertEquals(learn.state.object, 79, "apple, not three");
  assertEquals(learn.state.quantity, 3);
  forget();
});

test("forgetting drops the state, and the brain says so", async () => {
  forget();
  await brain("basket has three apple");
  assertEquals(await says("basket has how many apple?"), "three");
  forget();
  assertEquals(await says("basket has how many apple?"), "I don't know.");
});

test("counting a kind still counts the world, not any state", async () => {
  forget();
  await brain("basket has three apple");
  assertEquals(await says("how many fruit?"), "five", "unchanged by the basket");
  forget();
});

test("what a thing holds is state; what it is stays permanent", async () => {
  forget();
  assertEquals(await says("a basket is an object?"), "Yes.");
  await brain("basket has two apple");
  assertEquals(await says("a basket is an object?"), "Yes.", "state did not disturb kind");
  forget();
});
