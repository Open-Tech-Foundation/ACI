import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");

// The one the signals come from, so `i` lands on something.
const PERSON = 29;

test("a signal may say who did it", async () => {
  await forget();
  await brain("a basket holds three apple");
  await brain("i take one apple from the basket", { from: PERSON });
  assertEquals(
    (await brain("the basket holds how many apples?")).expression.state.says,
    "two",
    "the doer standing before the action does not stop it being read",
  );
  await forget();
});

test("what a word does in the past it does the same, on the other side of now", async () => {
  await forget();
  assertEquals((await brain("a basket had three apple")).expression.name, "learn");
  assertEquals((await brain("a basket held three apple")).expression.name, "learn");
  await forget();
});

test("what a get goes to is whoever did it", async () => {
  await forget();
  await brain("a person holds two apple");
  assertEquals((await brain("i got one apple", { from: PERSON })).expression.name, "learn");
  assertEquals(
    (await brain("i hold how many apples?", { from: PERSON })).expression.state.says,
    "three",
    "and it is the getter who came to hold it",
  );
  await forget();
});

test("nothing was said twice: the doer is the destination without saying so", async () => {
  await forget();
  await brain("a person holds two apple");
  const got = await brain("i get one apple", { from: PERSON });
  const did = (got.roots[0].branch || []).find((b) => b.kind === "did");
  assertEquals(did.state.before, 2);
  assertEquals(did.state.after, 3);
  await forget();
});

test("an action still needs a count it was given", async () => {
  await forget();
  await brain("a person holds two apple");
  // "an apple" says which, not how many, and the brain does not read one for it.
  assertEquals((await brain("i got an apple", { from: PERSON })).expression.name, "learn");
  await forget();
});

test("what happened is recorded whether or not it could be worked out", async () => {
  await forget();
  const r = await brain("i got one apple", { from: PERSON });
  const event = (r.roots[0].branch || []).find((b) => b.kind === "event");
  assert(/^get#\d+$/.test(event.name), "it was told a get happened");
  await forget();
});
