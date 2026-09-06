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

test("a claim held at arm's length is not made", async () => {
  // Said outright it is taken in; held at arm's length it is not.
  assert((await fresh("ice is a liquid")).learned != null);
  assertEquals((await fresh("ice might be a liquid")).learned, null);
  assertEquals((await fresh("ice might be a liquid", "ice is a liquid?")).expression.name, "unsure");
  await forget();
});

test("it is still checked, and the brain says what it found", async () => {
  assertEquals((await fresh("a cat might be an animal")).expression.name, "understood");
  assertEquals((await fresh("a cat might be a fish")).expression.name, "deny");
  await forget();
});

test("shall holds a claim at arm's length the way might does", async () => {
  assertEquals((await fresh("a cat shall be an animal")).expression.name, "understood");
  assertEquals((await fresh("a cat shall be a fish")).expression.name, "deny");
  assertEquals((await fresh("a cat shall be an animal")).learned, null);
  await forget();
});

test("the brain cannot tell might from does-not-know", async () => {
  // It has no notion of what could be, only of what it holds, so what it says
  // is what it found.
  assertEquals((await fresh("ice might be a liquid")).expression.name, "unsure");
  await forget();
});

test("every way of holding a claim at arm's length reads the same", async () => {
  for (const word of ["might", "may", "could", "would", "should", "must"]) {
    const r = await fresh(`a cat ${word} be a fish`);
    assertEquals(r.expression.name, "deny", word);
    assertEquals(r.learned, null, word);
  }
  await forget();
});

test("a modal joins a doing without taking it in", async () => {
  // Ability is checked, never taken in: the brain has no capability
  // knowledge, so an unobserved doing is unknown rather than denied.
  const r = await fresh("a cat can swim");
  assertEquals(r.expression.name, "unsure");
  assertEquals(r.learned, null);
  await forget();
});

test("a fronted modal asks the same question", async () => {
  assertEquals((await fresh("can a cat swim?")).expression.name, "unsure");
  assertEquals((await fresh("can a cat swim?")).learned, null);
  await forget();
});
