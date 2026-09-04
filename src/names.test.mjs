import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");
const says = async (said) => (await brain(said)).expression.state.says;

test("a word nothing knows, said to be of a kind, is a thing being named", async () => {
  await forget();
  const r = await brain("luna is a cat");
  assertEquals(r.expression.name, "learn");
  assertEquals(r.learned.terms[0].name, "luna");
  assertEquals(r.learned.terms[0].individual, true, "a thing there is one of");
  await forget();
});

test("what was named is met again by what it is called", async () => {
  await forget();
  await brain("luna is a cat");
  assertEquals((await brain("luna is an animal?")).expression.name, "affirm", "down the kinds");
  assertEquals((await brain("luna is a fish?")).expression.name, "deny");
  assertEquals(await says("what is luna"), "cat");
  await forget();
});

test("a named thing is a thing like any other", async () => {
  await forget();
  await brain("luna is a cat");
  await brain("luna weighs 4 kilogram");
  assertEquals(await says("luna weighs how many kilograms?"), "4");
  await forget();
});

test("a name is only given where a kind is said", async () => {
  await forget();
  // Nothing says what a qwerty is, so nothing is named.
  assertEquals((await brain("qwerty")).expression.name, "unheard");
  assertEquals((await brain("qwerty is a cat?")).learned, null, "asked, not told");
  await forget();
});

test("two things may be named, and told apart", async () => {
  await forget();
  await brain("luna is a cat");
  await brain("bruno is a dog");
  assertEquals((await brain("luna is a dog?")).expression.name, "deny");
  assertEquals((await brain("bruno is a dog?")).expression.name, "affirm");
  await forget();
});
