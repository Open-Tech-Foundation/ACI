import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");

// The one the signals come from, so `i` lands on something.
const PERSON = 29;
const said = (q) => brain(q, { from: PERSON });
const says = async (q) => (await said(q)).expression.state.says;

// A word may carry when a doing was, or that a signal is asking, without being
// one of the things the signal names. English writes `do`, `does` and `did`
// that way: they name nothing, they are never the joint, and the claim under
// them is read exactly as it would be without them.

test("an auxiliary names nothing and is not one of the things joined", async () => {
  await forget();
  await said("i have 3 tokens");
  assertEquals(await says("what do i have?"), "tokens");
  assertEquals(await says("how many tokens do i have?"), "three");
  await forget();
});

test("which end was said first is word order, not the fact", async () => {
  await forget();
  await said("i have 3 tokens");
  assertEquals(
    await says("how many tokens do i have?"),
    await says("i have how many tokens?"),
    "the counted thing may be said before the one holding it",
  );
  await forget();
});

test("an auxiliary carries a denial the same as any other claim", async () => {
  await forget();
  await said("i have 3 tokens");
  assertEquals((await said("i do not have tokens")).expression.name, "deny");
  await forget();
});

test("asked whether something happened, the brain looks rather than records", async () => {
  await forget();
  assertEquals((await said("did i rinse a cup?")).expression.name, "unsure",
    "nothing was ever said to have happened");
  assertEquals((await said("did i rinse a cup?")).learned, null, "and asking left nothing behind");
  await said("i rinsed a cup");
  assertEquals((await said("did i rinse a cup?")).expression.name, "affirm");
  await forget();
});

test("what happened to one thing is not what happened to another", async () => {
  await forget();
  await said("i rinsed a cup");
  assertEquals((await said("did i rinse a plate?")).expression.name, "unsure");
  await forget();
});

test("an ending on the auxiliary puts the asking behind", async () => {
  await forget();
  await said("i rinsed a cup");
  // `did` says nothing about what was done — it says when, and that this is a
  // question. What it asks about is the doing that follows it.
  assertEquals((await said("did i rinse a cup?")).expression.name, "affirm");
  await forget();
});

test("a relation joining two things is what the signal is about", async () => {
  await forget();
  // `saw` is a tool and also a doing. Something already joins the two things
  // here, so nothing is read as a doing and nothing is looked for.
  assertEquals((await brain("a saw is a tool?")).expression.name, "affirm");
  await forget();
});
