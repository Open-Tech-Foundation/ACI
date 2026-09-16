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
  assertEquals(r.expression.state.says, "I don't know.");
  await forget();
});

test("asked after one nothing is known of stays unknown", async () => {
  assertEquals((await fresh("what colour is my cat?")).expression.state.says, "I don't know.");
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

test("the brain does not say it knows nothing and then answer", async () => {
  // `whose sister is sofia?` was read as two questions at once — what the
  // sister is called, and what sofia is called — and both spoke: `I don't
  // know. sofia`. The word does not name the name relation, and a reading that
  // leaves the sister standing in the question does not answer from the bare
  // `is` beside her. One reply, and it is that the brain cannot read it.
  const r = await fresh("sofia is the sister of ilan", "whose sister is sofia?");
  assertEquals(r.expression.state.says, "I don't know.");
  await forget();
});

test("asking who somebody is still answers", async () => {
  // Nothing else stands in the question, so there is no word left doing
  // nothing and she is all there is to say.
  const r = await fresh("sofia is the sister of ilan", "who is sofia?");
  assertEquals(r.expression.state.says, "sofia");
  await forget();
});

test("and the relation asked the way it is held still answers", async () => {
  const r = await fresh("sofia is the sister of ilan", "who is the sister of ilan?");
  assertEquals(r.expression.state.says, "sofia");
  await forget();
});
