import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// Halving and doubling are worked, not looked up: what follows from a number
// is the brain's own, in any language and any world.
// Same signals in the same order give the same answers on every machine.

const { brain, forget } = openBrain("sqlite::memory:");

test("double works a number out", async () => {
  await forget();
  assertEquals((await brain("double 5")).expression.state.says, "10");
  await forget();
});

test("half of works a number out", async () => {
  await forget();
  assertEquals((await brain("half of 10")).expression.state.says, "5");
  await forget();
});

test("halve works a number out", async () => {
  await forget();
  assertEquals((await brain("halve 9")).expression.state.says, "4.5");
  await forget();
});
