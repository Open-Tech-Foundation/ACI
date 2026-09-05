import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// Named givings and worked sums join focus, latest first — so follow-up
// pointers keep up with the chain instead of going stale.
// Same signals in the same order give the same answers on every machine.

const { brain, forget } = openBrain("sqlite::memory:");

test("naming sets the topic", async () => {
  await forget();
  await brain("x is 5");
  assertEquals((await brain("what is it?")).expression.state.says, "number");
  await forget();
});

test("each add works from the last result", async () => {
  await forget();
  await brain("x is 5");
  assertEquals((await brain("add 6 to it")).expression.state.says, "11");
  assertEquals((await brain("add 60 to it")).expression.state.says, "71");
  await forget();
});

test("a result with no term still holds focus by value", async () => {
  await forget();
  await brain("x is 5");
  await brain("add 6 to it");
  await brain("add 60 to it");
  assertEquals((await brain("add 1 to it")).expression.state.says, "72");
  await forget();
});
