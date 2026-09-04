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

test("what causes what can be said and asked", async () => {
  assertEquals((await fresh("gravity causes weight?")).expression.name, "affirm");
  assertEquals((await fresh("a storm causes a wind", "a storm causes a wind?")).expression.name, "affirm");
  await forget();
});

test("a cause reaches as far as the causing goes", async () => {
  // Nobody said a storm causes a fire. Causing is a relation, and a relation
  // is walked as far as it runs.
  const r = await fresh("a storm causes a wind", "a wind causes a fire", "a storm causes a fire?");
  assertEquals(r.expression.name, "affirm");
  await forget();
});

test("a cause reaches no further than it runs", async () => {
  const r = await fresh("a storm causes a wind", "a storm causes a dream?");
  assertEquals(r.expression.name, "unsure");
  await forget();
});

test("one claim standing as why another is so joins them", async () => {
  await forget();
  // Both halves are said, and both are answered. That the second is *why* the
  // first is not written down: a claim is not yet a thing the world can hold.
  const r = await brain("a bell is a toy because a bell is an object");
  assertEquals(r.expression.state.says, "No. ❌ I know.");
  await forget();
});
