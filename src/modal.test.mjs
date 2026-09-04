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
