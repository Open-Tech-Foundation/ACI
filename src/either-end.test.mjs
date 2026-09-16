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

test("a place that is itself placed answers what stands in it, not where it stands", async () => {
  await forget();
  await brain("the flashlight is in the drawer");
  await brain("the drawer is in the wardrobe");
  // Both ends answer: what stands in the drawer (a flashlight) and where the
  // drawer itself stands (in a wardrobe). The hole `what` sits before the
  // joint `in`, so the near end is asked after — what stands in the drawer.
  // A `where` hole is the joint, names no side, and keeps the drawer the near
  // end, so the place answers what the drawer stands in.
  assertEquals(await says("what is in the drawer?"), "flashlight");
  assertEquals(await says("where is the drawer?"), "in a wardrobe");
  assertEquals(await says("who is in the drawer?"), "flashlight");
  await forget();
});

test("asked what was given, the thing answers; asked who, the giver answers", async () => {
  await forget();
  await brain("mira gives a book to kiran");
  // `who gives a book to kiran` asks the part nothing else plays — the giver.
  // `what does mira give` fronts its hole over the doing; an agent already
  // stands before the joint, so the hole reads the doing's other side: the
  // thing given, never mira.
  assertEquals(await says("who gives a book to kiran?"), "mira");
  assertEquals(await says("what does mira give to kiran?"), "book");
  assertEquals(await says("what does mira give?"), "book");
  await forget();
});

test("the end the question names is the end it is asked from", async () => {
  await forget();
  await brain("the pebble is in the pouch");
  assertEquals(await says("what is in the pouch?"), "pebble");
  // Nothing is in the pebble. Saying `pouch` would answer the question turned
  // round: a fact answers from either of its ends, never from the wrong one.
  assertEquals(await says("what is in the pebble?"), "I don't know.");
  await forget();
});

test("an ordering asked from the far end answers nothing, not the near one", async () => {
  await forget();
  await brain("ilan is taller than sofia");
  assertEquals(await says("who is taller than sofia?"), "ilan");
  assertEquals(await says("who is taller than ilan?"), "I don't know.");
  await forget();
});

test("a relation asked from the end it runs to answers nothing", async () => {
  await forget();
  await brain("arun is the father of meera");
  assertEquals(await says("who is the father of meera?"), "arun");
  // Arun has no father here, and meera is not his: she is the one he is
  // father to, which is the same fact read backwards.
  assertEquals(await says("who is the father of arun?"), "I don't know.");
  await forget();
});
