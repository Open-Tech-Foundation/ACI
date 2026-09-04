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
