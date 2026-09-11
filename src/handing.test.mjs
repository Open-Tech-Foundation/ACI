import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");

async function fresh(...said) {
  await forget();
  let last;
  for (const s of said) last = await brain(s);
  return last;
}

test("a thing handed over with no number said is one thing", async () => {
  // It moved nothing at all: what passes was worked out from a count, and
  // nobody had said one, so the giving was written down and changed nothing.
  assertEquals(
    (await fresh("mira gave a key to kiran", "does kiran have a key?")).expression.name,
    "affirm",
  );
  assertEquals(
    (await fresh("mira gave a key to kiran", "how many keys does kiran have?"))
      .expression.state.says,
    "one",
  );
  await forget();
});

test("and is found by the word anybody would ask with", async () => {
  assertEquals(
    (await fresh("nila gave a coin to ravi", "who has a coin?")).expression.state.says,
    "ravi",
  );
  await forget();
});

test("a count said is still counted", async () => {
  const told = ["dev has 3 kettles", "dev gave 1 kettle to mira"];
  assertEquals((await fresh(...told, "how many kettles does dev have?")).expression.state.says, "two");
  assertEquals((await fresh(...told, "how many kettles does mira have?")).expression.state.says, "one");
  await forget();
});

test("nothing was handed to nobody", async () => {
  assertEquals(
    (await fresh("mira gave a key to kiran", "does mira have a key?")).expression.name,
    "unsure",
    "nobody said what mira had, and one leaving says nothing about the rest",
  );
  await forget();
});
