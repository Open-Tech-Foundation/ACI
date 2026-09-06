import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// Thanks is a doing, heard and taken in — never unheard, never a claim about
// the world.
// Same signals in the same order give the same answers on every machine.

const { brain, forget } = openBrain("sqlite::memory:");

test("thank you is heard and taken in", async () => {
  await forget();
  const r = await brain("thank you");
  assertEquals(r.expression.name, "learn");
  assert(r.learned != null, "the thanking goes on the record");
  await forget();
});
