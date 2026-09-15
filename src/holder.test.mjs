import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");

const says = async (line) => (await brain(line)).expression.state.says;

test("a property is answered by the thing this conversation told it of", async () => {
  await forget();
  await brain("the fire is red");
  // The conversation's holder sits in front of the nature the authored world
  // walks from red up to property.
  assertEquals(await says("what is red?"), "fire");
  await forget();
  // Where nobody holds it, the nature answers as it always did.
  assertEquals(await says("what is red?"), "colour, property");
  await forget();
});

test("everything told red answers", async () => {
  await forget();
  await brain("the fire is red");
  await brain("the door is red");
  assertEquals(await says("what is red?"), "fire, door");
  await forget();
});

test("a thing predicated of answers a who after its property", async () => {
  await forget();
  await brain("sara is tall");
  assertEquals(await says("who is tall?"), "sara");
  await brain("john is tall");
  assertEquals(await says("who is tall?"), "sara, john");
  await forget();
  // Nothing in this conversation stands tall.
  assertEquals((await brain("who is tall?")).expression.name, "unsure");
  await forget();
  // A written state reads back the same way.
  await brain("the sky is blue");
  assertEquals(await says("what is blue?"), "sky");
  await forget();
});

test("a kind is still the far end of a fact about it", async () => {
  await forget();
  await brain("mira is a heron");
  // `who` finds the individual, `what` finds what a heron is, and the
  // conversation holding the kind is not what it is.
  assertEquals(await says("who is a heron?"), "mira");
  assertEquals(await says("what is a heron?"), "bird");
  await forget();
  await brain("tom is a cat");
  assertEquals(await says("what is a cat?"), "mammal");
  assertEquals(await says("who is a cat?"), "tom");
  await forget();
});