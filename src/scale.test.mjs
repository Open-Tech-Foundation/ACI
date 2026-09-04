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

test("a property may run along a scale, and its ways sit on it in order", async () => {
  assertEquals((await fresh("hot more cold?")).expression.name, "affirm");
  assertEquals((await fresh("warm more cold?")).expression.name, "affirm");
  assertEquals((await fresh("hot more warm?")).expression.name, "affirm");
  assertEquals((await fresh("heavy more lightweight?")).expression.name, "affirm");
  assertEquals((await fresh("big more small?")).expression.name, "affirm");
  await forget();
});

test("standing further along one way is standing less far the other", async () => {
  assertEquals((await fresh("cold more hot?")).expression.name, "deny");
  assertEquals((await fresh("cold less hot?")).expression.name, "affirm");
  assertEquals((await fresh("hot less cold?")).expression.name, "deny");
  await forget();
});

test("a property with no scale refuses the comparison rather than guessing", async () => {
  // Red is not more than blue, and nothing about colour says it could be.
  assertEquals((await fresh("red more blue?")).expression.name, "unsure");
  assertEquals((await fresh("blue more red?")).expression.name, "unsure");
  await forget();
});

test("two scales are not one scale", async () => {
  assertEquals((await fresh("hot more big?")).expression.name, "unsure");
  assertEquals((await fresh("heavy more cold?")).expression.name, "unsure");
  await forget();
});

test("a thing is placed on a scale by what it is", async () => {
  const r = await fresh("a stone is heavy", "an apple is lightweight", "a stone more an apple?");
  assertEquals(r.expression.name, "affirm");
  const back = await fresh("a stone is heavy", "an apple is lightweight", "an apple more a stone?");
  assertEquals(back.expression.name, "deny");
  await forget();
});

test("a thing nothing has placed has no place", async () => {
  assertEquals((await fresh("a stone more an apple?")).expression.name, "unsure");
  await forget();
});

test("a comparison is worked out, never taken in as a fact", async () => {
  const r = await fresh("hot more cold");
  assertEquals(r.expression.name, "understood", "it already knew, from the scale");
  assertEquals(r.learned, null, "and there was nothing to write down");
  await forget();
});

test("counting is the case where the world can already say which is greater", async () => {
  assertEquals((await fresh("3 more 2?")).expression.name, "affirm");
  assertEquals((await fresh("2 more 3?")).expression.name, "deny");
  assertEquals((await fresh("2 less 3?")).expression.name, "affirm");
  await forget();
});

test("how much is a scale the brain cannot yet be asked about", async () => {
  // none, few, many, all are ordered in the world like any other scale, but
  // they are kinds of quantity, and a quantity is what a signal says of a
  // thing rather than a thing the signal speaks about. So the order is there
  // and there is no way to ask after it.
  assertEquals((await fresh("few more none?")).expression.name, "unknown");
  await forget();
});
