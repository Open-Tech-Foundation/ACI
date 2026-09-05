import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");
const PERSON = 29;
const says = async (said) => (await brain(said, { from: PERSON })).expression.state.says;

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

test("a thing named keeps what the same signal said of it", async () => {
  await forget();
  // The name and what is said of it arrive together, so the thing is made
  // before anything is judged and the rest is said of it, not of nothing.
  await brain("john has 3 apples");
  assertEquals(await says("john has how many apples?"), "three");
  await brain("give 1 apple to john", { from: 29 });
  assertEquals(await says("john has how many apples?"), "four");
  await forget();
});

test("a thing named by anything said of it is still a thing", async () => {
  await forget();
  await brain("alice measures 2 metre");
  await brain("bob measures 1 metre");
  assertEquals((await brain("alice is bigger than bob?")).expression.name, "affirm");
  await forget();
});

test("two things named in one breath may be joined to each other", async () => {
  await forget();
  // A link cannot reach a thing that is not there yet, so every term is
  // written before any link is.
  await brain("ravi is in chennai");
  assertEquals((await brain("ravi is in chennai?")).expression.name, "affirm");
  assertEquals(await says("where is ravi"), "chennai");
  await forget();
});

test("a named thing is said by its name", async () => {
  await forget();
  // No language lists it, so there is nothing to look it up in. A name is not
  // translated: it is what the thing is written as.
  await brain("bruno is in dublin");
  assertEquals(await says("where is bruno"), "dublin");
  await forget();
});

test("a thing's name may be told with the ending that says whose it is", async () => {
  await forget();
  await brain("i saw a film", { from: PERSON });
  assertEquals((await brain("the film's name is arrival", { from: PERSON })).expression.name, "learn");
  assertEquals(await says("what is the film's name?"), "arrival");
  await forget();
});

test("what was spoken of last is what a pointer lands on next", async () => {
  await forget();
  // Nothing was learned by `i saw a film` about a film's name — but something
  // happened to one film, and that one is what `its` means in the next signal.
  await brain("i saw a film", { from: PERSON });
  await brain("its name is arrival", { from: PERSON });
  assertEquals(await says("what is its name?"), "arrival");
  await forget();
});

test("a possessive landing on nothing names nothing", async () => {
  await forget();
  // Nothing has been spoken of, so `its` is nobody's. The brain does not read
  // past it and take the name relation itself for the thing being spoken of.
  const r = await brain("its name is arrival", { from: PERSON });
  assertEquals(r.expression.name, "unknown");
  assertEquals(r.learned, null);
  await forget();
});

test("a thing spoken of as one of its kind is one of them, not the kind", async () => {
  await forget();
  const r = await brain("i saw a film", { from: PERSON });
  const made = r.learned.terms.find((t) => t.name.startsWith("film#"));
  assert(made != null, "one film was made for the seeing");
  assertEquals(made.individual, true);
  // And it is said by what it is, having never been called anything.
  assertEquals(await says("i saw what?"), "film");
  await forget();
});

test("a number beside a word nothing knows counts it, and it names a kind", async () => {
  await forget();
  const r = await brain("i have 3 crayons", { from: PERSON });
  const named = r.learned.terms.find((t) => t.name === "crayons");
  assertEquals(named.individual, false, "there are three of them, so they are a kind");
  assertEquals(await says("i have how many crayons?"), "three");
  await forget();
});
