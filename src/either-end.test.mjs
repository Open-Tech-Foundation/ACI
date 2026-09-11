import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");

const says = async (line) => (await brain(line)).expression.state.says;

test("a fact answers from either of its ends", async () => {
  await forget();
  await brain("dev has 2 kettles");
  assertEquals(await says("what does dev have?"), "kettle");
  assertEquals(await says("who has kettles?"), "dev");
  await forget();
});

test("everything standing at the near end answers", async () => {
  await forget();
  await brain("dev has 3 kettles");
  await brain("mira has 1 kettle");
  assertEquals(await says("who has kettles?"), "dev, mira");
  await forget();
});

test("a place answers from the thing placed and from the place", async () => {
  await forget();
  await brain("the lamp is on the crate");
  assertEquals(await says("where is the lamp?"), "on a crate");
  assertEquals(await says("what is on the crate?"), "lamp");
  await forget();
});

test("a hole that is itself the joint leaves the thing at the near end", async () => {
  await forget();
  await brain("the lamp is under the crate");
  // `where` asks by placement and names no side of it, so the lamp is read
  // the way a statement's first thing is — never as what the crate is under.
  assertEquals(await says("where is the lamp?"), "under a crate");
  await forget();
});

test("a part answers from the whole", async () => {
  await forget();
  await brain("a wheel is part of a cart");
  assertEquals(await says("what is part of a cart?"), "wheel");
  await forget();
});

test("where both ends answer, the side of the joint decides", async () => {
  await forget();
  await brain("mira is taller than dev");
  await brain("dev is taller than sam");
  // Walking out from dev finds sam, walking back finds mira. The thing
  // stands after the joint, so it is the far end and the hole is the near one.
  assertEquals(await says("who is taller than dev?"), "mira");
  await forget();
});

test("what a thing is stays the far end", async () => {
  await forget();
  await brain("mira is a heron");
  assertEquals(await says("what is mira?"), "heron");
  await forget();
});

test("a fact nothing stands at the near end of is unknown", async () => {
  await forget();
  await brain("dev has 2 kettles");
  assertEquals((await brain("who has stamps?")).expression.name, "unsure");
  await forget();
});

test("asked who, only somebody answers", async () => {
  await forget();
  await brain("mira is a heron");
  // The kind is the far end of the fact and the individual is the near one,
  // so `who` finds mira where `what` finds what a heron is.
  assertEquals(await says("who is a heron?"), "mira");
  assertEquals(await says("what is a heron?"), "bird");
  await forget();
});

test("asked who, a kind is no answer", async () => {
  await forget();
  // Nothing is known to be a cat, and a mammal is not somebody.
  assertEquals((await brain("who is a cat?")).expression.name, "unsure");
  assertEquals(await says("what is a cat?"), "mammal");
  await forget();
});

test("asked who somebody is, what is known of them answers", async () => {
  await forget();
  await brain("mira is a heron");
  // Told who already, the question is not asking for another somebody.
  assertEquals(await says("who is mira?"), "heron");
  await forget();
});

test("an article says which one, never who", async () => {
  await forget();
  // `a` marks which heron is meant and stands for nobody, so it never makes
  // `who` the name question that `who are you` is.
  await brain("dev has 2 kettles");
  assertEquals(await says("who has the kettle?"), "dev");
  assertEquals(await says("who has a kettle?"), "dev");
  await forget();
});

test("a question naming a word it never met still answers", async () => {
  await forget();
  // `telescope` is no word and no term. The question was understood whole;
  // there is simply nothing to find.
  assertEquals((await brain("who has the telescope?")).expression.name, "unsure");
  assertEquals((await brain("who has the telescope")).expression.name, "unsure");
  await forget();
});
