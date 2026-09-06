import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// Clause anaphora: `so` stands for the last idea as a question — checking it
// again, never asserting it.
// Same signals in the same order give the same answers on every machine.

const { brain, forget } = openBrain("sqlite::memory:");

test("is it so checks the last idea", async () => {
  await forget();
  await brain("a banjo is big");
  assertEquals(
    (await brain("is it so?")).expression.state.says,
    "Yes. ✅ a banjo is big.",
  );
  await forget();
});

test("so with no idea names nothing", async () => {
  await forget();
  assertEquals((await brain("is it so?")).expression.name, "unknown");
  await forget();
});

test("so after a denial denies", async () => {
  await forget();
  await brain("a banjo is not big");
  assertEquals((await brain("is it so?")).expression.name, "deny");
  await forget();
});
