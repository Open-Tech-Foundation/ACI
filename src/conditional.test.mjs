import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");

async function fresh(...said) {
  await forget();
  let last;
  for (const s of said) last = await brain(s);
  return last;
}

test("what follows a condition that holds is taken in", async () => {
  const r = await fresh("if a planet is a thing then metal is a food");
  assertEquals(r.expression.name, "learn");
  assertEquals(r.learned.terms[0].name, "metal");
  await forget();
});

test("what follows a condition that does not hold is not", async () => {
  const r = await fresh("if a planet is a knife then metal is a food");
  assertEquals(r.learned, null, "the condition did not stand, so nothing followed");
  assertEquals((await fresh("metal is a food?")).expression.name, "unsure",
    "and it was not quietly taken in some other way");
  await forget();
});

test("the condition itself is never taken in", async () => {
  await fresh("if metal is a food then blood is a liquid");
  assertEquals((await brain("metal is a food?")).expression.name, "unsure",
    "putting a claim as a condition is not saying it");
  await forget();
});

test("what follows is checked, not swallowed", async () => {
  const r = await fresh("if a planet is a thing then a planet is a knife");
  assertEquals(r.expression.name, "conflict", "told two things that cannot both be true");
  assertEquals(r.learned, null);
  await forget();
});

test("what follows that the brain already holds teaches it nothing", async () => {
  const r = await fresh("if a planet is a thing then blood is a liquid");
  assertEquals(r.expression.name, "understood");
  assertEquals(r.learned, null);
  await forget();
});

test("two claims put as condition and consequence are not two signals", async () => {
  // A join says two things side by side; a condition says one turns on the
  // other, and the brain must not read the first as the second.
  const joined = await fresh("metal is a food and blood is a liquid");
  assert(joined.learned != null, "joined, both are said");
  const ruled = await fresh("if a planet is a knife then metal is a food");
  assertEquals(ruled.learned, null, "conditioned, neither is");
  await forget();
});

test("what the brain worked out, it can say what it stands on", async () => {
  await forget();
  await brain("if a drum is cold then a bell is red");
  await brain("a drum is cold");
  assertEquals((await brain("is a bell red?")).expression.name, "affirm");
  assertEquals(
    (await brain("why is a bell red?")).expression.state.says,
    "a drum is cold",
    "not that it holds, but what it followed from",
  );
  await forget();
});

test("a chain is walked back a step at a time", async () => {
  await forget();
  await brain("if a drum is cold then a bell is red");
  await brain("if a bell is red then a cup is blue");
  await brain("a drum is cold");
  assertEquals((await brain("is a cup blue?")).expression.name, "affirm");
  assertEquals((await brain("why is a cup blue?")).expression.state.says, "a bell is red");
  assertEquals((await brain("why is a bell red?")).expression.state.says, "a drum is cold");
  // Told, not worked out: it stands on nothing, and the brain does not invent
  // something for it to stand on.
  assertEquals((await brain("why is a drum cold?")).expression.name, "unsure");
  await forget();
});
