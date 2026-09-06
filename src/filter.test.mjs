import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A description before `one` restricts which one, never offers its own fact.
// Same signals in the same order give the same answers on every machine.

const { brain, forget } = openBrain("sqlite::memory:");

test("an adjective before one restricts, claims nothing", async () => {
  await forget();
  await brain("a flute is cool");
  const r = await brain("the sweet one is hot");
  assertEquals(
    r.learned.terms.length,
    1,
    "one fact taken in, not two — sweetness itself claims nothing",
  );
  assertEquals(
    (await brain("is a flute hot?")).expression.state.says,
    "Yes. ✅ a flute is hot.",
    "the head claim lands",
  );
  await forget();
});

test("a noun before one restricts, claims nothing", async () => {
  await forget();
  await brain("a cello is cool");
  await brain("the brass one is sweet");
  assertEquals(
    (await brain("is a cello sweet?")).expression.state.says,
    "Yes. ✅ a cello is sweet.",
  );
  assertEquals(
    (await brain("is brass sweet?")).expression.name,
    "unsure",
    "brass itself was never said to be sweet",
  );
  await forget();
});
