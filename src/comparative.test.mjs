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

const MEASURED = [
  "a cow weighs 500 gram",
  "the cow measures 2 metre",
  "a goat weighs 200 gram",
  "the goat measures 3 metre",
];

test("a comparative says which scale it compares on", async () => {
  // The same two things, and two answers: heavier reads what they weigh,
  // bigger reads how big they are, and neither reads the other.
  assertEquals((await fresh(...MEASURED, "a cow is heavier than a goat?")).expression.name, "affirm");
  assertEquals((await fresh(...MEASURED, "a cow is bigger than a goat?")).expression.name, "deny");
  await forget();
});

test("the other way round is the other end of the same scale", async () => {
  assertEquals((await fresh(...MEASURED, "a cow is smaller than a goat?")).expression.name, "affirm");
  assertEquals((await fresh(...MEASURED, "a goat is heavier than a cow?")).expression.name, "deny");
  await forget();
});

test("with no scale said, two scales that disagree are no answer", async () => {
  const r = await fresh(...MEASURED, "a cow more a goat?");
  assertEquals(r.expression.name, "unsure", "heavier and smaller at once is not the comparison");
  await forget();
});

test("a thing nothing has measured cannot be compared", async () => {
  assertEquals((await fresh("a cow is heavier than a goat?")).expression.name, "unsure");
  await forget();
});

test("the things compared are the things, not the words joining them", async () => {
  // `a cow is heavier than a goat` names two relations, and neither of them
  // is one of the things being compared.
  const one = await fresh("a cow weighs 500 gram", "a goat weighs 200 gram", "a cow is heavier than a goat?");
  assertEquals(one.expression.name, "affirm");
  await forget();
});
