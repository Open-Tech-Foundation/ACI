import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// Superlatives derive like plurals and pasts: no `-est` is written down, and
// derivation is exact — nothing is guessed. A description before a noun head
// restricts it, never joins the doing.
// Same signals in the same order give the same answers on every machine.

const { brain, forget } = openBrain("sqlite::memory:");

test("biggest reaches big through doubled consonants", async () => {
  await forget();
  assertEquals((await brain("the biggest wren eats trout")).expression.name, "learn");
  assertEquals((await brain("who ate trout?")).expression.state.says, "wren");
  await forget();
});

test("smallest reaches small directly", async () => {
  await forget();
  assertEquals((await brain("the smallest finch eats tuna")).expression.name, "learn");
  assertEquals((await brain("who ate tuna?")).expression.state.says, "finch");
  await forget();
});

test("an ending that reaches nothing is unheard, not neared", async () => {
  await forget();
  assertEquals((await brain("the xqest wren eats trout")).expression.name, "unheard");
  await forget();
});

test("tallest reaches tall", async () => {
  await forget();
  assertEquals((await brain("the tallest pig is quiet")).expression.name, "learn");
  assertEquals((await brain("is a pig quiet?")).expression.name, "affirm");
  await forget();
});

test("heaviest reaches heavy through iest", async () => {
  await forget();
  assertEquals((await brain("the heaviest pig is quiet")).expression.name, "learn");
  assertEquals((await brain("is a pig quiet?")).expression.name, "affirm");
  await forget();
});

test("warmest reaches warm", async () => {
  await forget();
  assertEquals((await brain("the warmest room is bright")).expression.name, "learn");
  assertEquals((await brain("is a room bright?")).expression.name, "affirm");
  await forget();
});

test("a noun filed red still restricts", async () => {
  await forget();
  assertEquals((await brain("the red pig is dirty")).expression.name, "learn");
  assertEquals((await brain("is a pig dirty?")).expression.name, "affirm");
  await forget();
});

test("a superlative asks after the far end of an ordering", async () => {
  await forget();
  await brain("sara is older than tom");
  await brain("tom is older than mike");
  assertEquals((await brain("who is the oldest?")).expression.state.says, "sara");
  assertEquals(
    (await brain("who is the youngest?")).expression.state.says,
    "mike",
    "the same ordering read from the other end",
  );
  await forget();
});

test("asking which is furthest along is not asking how far along one is", async () => {
  await forget();
  // `old` is measured on the scale of age, and a question naming a scale is
  // answered by what stands on it. This one names no thing to have been
  // measured: it asks which of them is furthest, and the ordering answers.
  await brain("nila is older than ravi");
  assertEquals((await brain("who is the oldest?")).expression.state.says, "nila");
  await forget();
});
