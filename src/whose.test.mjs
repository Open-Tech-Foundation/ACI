import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");
const PERSON = 29;
const says = async (q) => (await brain(q, { from: PERSON })).expression.state.says;

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
  // `of` says whose: the leg of a cow is the leg a cow has. Asked whether that
  // leg is a body, the answer is the one the brain gives of any leg — `is a leg
  // a body?` is no — and it used to come back unsure, out of a reading in which
  // the leg held the cow and held a body besides.
  assertEquals((await fresh("a leg of a cow is a body?")).expression.name, "deny");
  await forget();
});

test("what is said of the long way round is said of the near one", async () => {
  // `the roof of the shed is red` is the shed's roof being red. It was holding
  // the roof against the shed, the roof against red, and then saying red of the
  // shed — three facts and every one of them wrong.
  await forget();
  await brain("the roof of the shed is red");
  assertEquals(await says("what colour is the roof?"), "red");
  assertEquals(await says("what colour is the roof of the shed?"), "red");
  assertEquals(await says("is the shed red?"), "I don't know.");
  assertEquals(await says("what is the shed?"), "building");
  await forget();
});

test("a joint the language names keeps the one that owns before it", async () => {
  // `a shelf has books` names the holding, and what owns stands first; only a
  // joint the language writes rather than names turns it round.
  await forget();
  await brain("a shelf has 5 books and 8 files");
  assertEquals(await says("how many books does the shelf have?"), "five");
  assertEquals(await says("how many kinds of book does the shelf have?"), "one");
  await forget();
});

test("a hole asking after whoever stands at the far end of the relation it determines", async () => {
  // `whose sister is sofia?` asks who sofia is sister of: the copula is the
  // joint, but the sisterhood is what joins, and sofia stands at its near
  // end. One reply, and it is the one at the far end.
  const r = await fresh("sofia is the sister of ilan", "whose sister is sofia?");
  assertEquals(r.expression.state.says, "ilan");
  await forget();
});

test("a possessor hole with nothing standing there knows of none", async () => {
  const r = await fresh("sofia is the sister of ilan", "whose sister is amal?");
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
