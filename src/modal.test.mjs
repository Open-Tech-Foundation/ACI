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
  assert((await fresh("ice is a medicine")).learned != null);
  assertEquals((await fresh("ice might be a liquid")).learned, null);
  assertEquals((await fresh("ice might be a liquid", "ice is a medicine?")).expression.name, "unsure");
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
  assertEquals((await fresh("ice might be a medicine")).expression.name, "unsure");
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

test("being able to do something is a fact about the thing", async () => {
  // It used to be checked and dropped, so the brain held no ability at all
  // and `a cat can swim` left it exactly as it was.
  const r = await fresh("a cat can swim");
  assertEquals(r.expression.name, "learn");
  assert(r.learned != null, "what a thing can do is something it holds");
  await forget();
});

test("being unable is a fact the same way", async () => {
  // `cannot` and `can't` are one word for `can not`, and all three deny the
  // ability where `can` would affirm it.
  for (const word of ["can not", "cannot", "can't"]) {
    assertEquals((await fresh(`a bird ${word} swim`)).expression.name, "learn", word);
    assertEquals((await fresh(`a bird ${word} swim`, "can a bird swim?")).expression.name, "deny", word);
    assertEquals((await fresh(`a bird ${word} swim`, `a bird ${word} swim?`)).expression.name, "affirm", word);
  }
  await forget();
});

test("asking an untold unable is an honest unsure", async () => {
  assertEquals((await fresh("a bird can't swim?")).expression.name, "unsure");
  assertEquals((await fresh("a bird cannot swim?")).expression.name, "unsure");
  await forget();
});

test("a fronted modal asks after what was told", async () => {
  assertEquals((await fresh("can a cat swim?")).expression.name, "unsure");
  assertEquals((await fresh("can a cat swim?")).learned, null, "a question teaches nothing");
  assertEquals((await fresh("a cat can swim", "can a cat swim?")).expression.name, "affirm");
  await forget();
});

test("what a kind can do, one of it can", async () => {
  assertEquals((await fresh("a bird can fly", "can a wren fly?")).expression.name, "affirm");
  assertEquals(
    (await fresh("a wren can fly", "can a bird fly?")).expression.name,
    "unsure",
    "and not the other way round",
  );
  assertEquals(
    (await fresh("a bird can fly", "can a trout fly?")).expression.name,
    "unsure",
    "nothing said a trout could, and not being told is not being told it cannot",
  );
  await forget();
});

test("holding a claim at arm's length is not the same as being able", async () => {
  // `might` says nothing about what a thing can do, and is still checked and
  // dropped the way it always was.
  assertEquals((await fresh("a cat might swim")).learned, null);
  await forget();
});

test("what must be so is not what is so", async () => {
  // `must` had no term at all, so `devi must swim` left the brain nothing to
  // hold. Being required to do something is a relation between somebody and a
  // doing, the same shape as being able to — and neither is having done it.
  await forget();
  await brain("devi must swim");
  assertEquals((await brain("must devi swim?")).expression.name, "affirm");
  assertEquals((await brain("did devi swim?")).expression.name, "unsure");
  assertEquals((await brain("can devi swim?")).expression.name, "unsure");
  await forget();
});
