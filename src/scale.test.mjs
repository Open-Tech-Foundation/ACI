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

const WEIGHED = ["an apple weighs ten gram", "a stone weighs five gram"];

test("a thing is measured on a scale, and the amount is what is kept", async () => {
  const r = await fresh("an apple weighs ten gram");
  assertEquals(r.expression.name, "learn");
  const link = r.learned.terms[0].links.find((l) => l.quantity === 10);
  assert(link != null, "ten of something, on the record");
  await forget();
});

test("which is further along the scale is what the amounts say", async () => {
  assertEquals((await fresh(...WEIGHED, "an apple more a stone?")).expression.name, "affirm");
  assertEquals((await fresh(...WEIGHED, "a stone more an apple?")).expression.name, "deny");
  await forget();
});

test("standing further along one way is standing less far the other", async () => {
  assertEquals((await fresh(...WEIGHED, "a stone less an apple?")).expression.name, "affirm");
  assertEquals((await fresh(...WEIGHED, "an apple less a stone?")).expression.name, "deny");
  await forget();
});

test("what a thing has been called decides nothing", async () => {
  // Calling the stone heavy and the apple light says nothing about which is
  // heavier: the names are regions of a scale, and which region a value falls
  // in depends on what it is read against.
  const r = await fresh("a stone is heavy", "an apple is lightweight", "a stone more an apple?");
  assertEquals(r.expression.name, "unsure");
  await forget();
});

test("a thing nothing has measured has no place on the scale", async () => {
  assertEquals((await fresh("a stone more an apple?")).expression.name, "unsure");
  assertEquals((await fresh("an apple weighs ten gram", "a stone more an apple?")).expression.name, "unsure",
    "one measured and one not is still nothing to compare");
  await forget();
});

test("two units are not one scale until something says how they stand", async () => {
  const r = await fresh("an apple weighs ten gram", "a stone weighs five kilogram", "a stone more an apple?");
  assertEquals(r.expression.name, "unsure", "five kilograms and ten grams do not compare yet");
  await forget();
});

test("a unit says which property it is of", async () => {
  assertEquals((await fresh("a gram is a unit?")).expression.name, "affirm");
  assertEquals((await fresh("a metre is a unit?")).expression.name, "affirm");
  assertEquals((await fresh("a second is a unit?")).expression.name, "affirm");
  await forget();
});

test("a comparison is worked out, never taken in as a fact", async () => {
  const r = await fresh(...WEIGHED, "an apple more a stone");
  assertEquals(r.expression.name, "understood", "it worked it out from the amounts");
  assertEquals(r.learned, null, "and there was nothing to write down");
  await forget();
});

test("counting is the case where the world can already say which is greater", async () => {
  assertEquals((await fresh("3 more 2?")).expression.name, "affirm");
  assertEquals((await fresh("2 more 3?")).expression.name, "deny");
  assertEquals((await fresh("2 less 3?")).expression.name, "affirm");
  await forget();
});
