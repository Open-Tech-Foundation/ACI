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

test("a reading is not a thing that has one", async () => {
  // Hot is not a thing that is hot. It is what a thing's temperature comes to,
  // and nothing in the world says one reading is more than another reading.
  assertEquals((await fresh("hot more cold?")).expression.name, "unsure");
  assertEquals((await fresh("heavy more lightweight?")).expression.name, "unsure");
  assertEquals((await fresh("big more small?")).expression.name, "unsure");
  await forget();
});

test("standing further along one way is standing less far the other", async () => {
  const told = ["a stone is heavy", "an apple is lightweight"];
  assertEquals((await fresh(...told, "an apple more a stone?")).expression.name, "deny");
  assertEquals((await fresh(...told, "an apple less a stone?")).expression.name, "affirm");
  assertEquals((await fresh(...told, "a stone less an apple?")).expression.name, "deny");
  await forget();
});

test("a property with no scale refuses the comparison rather than guessing", async () => {
  // Red is not more than blue, and nothing about colour says it could be.
  const told = ["a stone is red", "an apple is blue"];
  assertEquals((await fresh(...told, "a stone more an apple?")).expression.name, "unsure");
  await forget();
});

test("two scales are not one scale", async () => {
  // A thing may be heavier and colder at once, and neither of those is the
  // comparison, so the brain does not pick one.
  const told = ["a stone is heavy", "a stone is cold", "an apple is lightweight", "an apple is hot"];
  assertEquals((await fresh(...told, "a stone more an apple?")).expression.name, "unsure");
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
  const r = await fresh("a stone is heavy", "an apple is lightweight", "a stone more an apple");
  assertEquals(r.expression.name, "understood", "it already knew, from where each stands");
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
