import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");
const PERSON = 29;

async function fresh(...said) {
  await forget();
  let last;
  for (const s of said) last = await brain(s, { from: PERSON });
  return last;
}

test("a thing may be whose", async () => {
  // `my cat` is not cats: it is the one cat the sender has, and what is said
  // of it is said of that one.
  const r = await fresh("my cat is red", "what colour is my cat?");
  assertEquals(r.expression.state.says, "red");
  await forget();
});

test("whose it is, is whom the word points at", async () => {
  // The sender's cat is not the one it went to.
  const r = await fresh("my cat is red", "what colour is your cat?");
  assertEquals(r.expression.state.says, "none");
  await forget();
});

test("asked after one nothing has, there is none", async () => {
  assertEquals((await fresh("what colour is my cat?")).expression.state.says, "none");
  await forget();
});

test("a thing whose is still of its kind", async () => {
  assertEquals((await fresh("my cat is red", "my cat is a mammal?")).expression.name, "affirm");
  await forget();
});

test("a thing with nobody's name on it is the kind, as before", async () => {
  assertEquals((await fresh("a cat is an animal?")).expression.name, "affirm");
  await forget();
});

test("whose a thing is may be said the long way round", async () => {
  // `of` says whose: the leg of a cow is the leg a cow has.
  assertEquals((await fresh("a leg of a cow is a body?")).expression.name, "unsure");
  await forget();
});
