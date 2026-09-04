import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");
const PERSON = 29;
const ask = async (said) => {
  await forget();
  return (await brain(said, { from: PERSON })).expression.name;
};

test("nobody is not a body: it is a person, and the signal denies it", async () => {
  // The denial is the word's; the person is the world's. So `nobody is a cat`
  // says of persons what `a person is not a cat` says.
  assertEquals(await ask("nobody is a cat?"), "affirm");
  assertEquals(await ask("nobody is a person?"), "deny");
  await forget();
});

test("nothing is a thing, denied", async () => {
  assertEquals(await ask("nothing is a thing?"), "deny");
  await forget();
});

test("a word saying how much of a state says nothing the brain can hold", async () => {
  // The brain has no notion of how much of a state a thing is in, so `very`
  // stands where it stands and the claim is read without it.
  assertEquals(await ask("a stone is very heavy?"), "unsure");
  assertEquals(await ask("a stone is heavy?"), "unsure");
  await forget();
});

test("whose a thing is may be pointed at rather than named", async () => {
  await forget();
  assertEquals((await brain("my cat is a mammal?", { from: PERSON })).expression.name, "affirm");
  await brain("a cow weighs 500 gram");
  assertEquals((await brain("his cat is a mammal?", { from: PERSON })).expression.name, "affirm");
  await forget();
});
