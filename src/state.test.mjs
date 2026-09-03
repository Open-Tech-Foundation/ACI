import { test, assert, assertEquals } from "runtime:test";
import { brain, forget } from "./index.js";

const says = async (q) => (await brain(q)).expression.state.says;
const held = (r) => (r.roots[0].branch || []).find((b) => b.kind === "count");

test("a thing can hold a number of something, and the brain remembers", async () => {
  forget();
  assertEquals(await says("basket has how many apple?"), "I don't know.");
  await brain("basket has three apple");
  assertEquals(await says("basket has how many apple?"), "three");
  forget();
});

test("a different count is a change of state, not a contradiction", async () => {
  forget();
  await brain("basket has three apple");
  const r = await brain("basket has two apple");
  assert(r.learned !== null, "it takes the new count");
  assertEquals((r.roots[0].branch || []).find((b) => b.kind === "refuse"), undefined);
  assertEquals(await says("basket has how many apple?"), "two");
  forget();
});

test("the count is carried on the link, not on the thing", async () => {
  forget();
  await brain("basket has three apple");
  assertEquals(
    (await brain("basket has three apple")).learned,
    null,
    "telling it the same thing again changes nothing",
  );
  forget();
});

test("a number spent counting is not one of the things being spoken about", async () => {
  forget();
  const r = await brain("basket has three apple");
  const learn = (r.roots[0].branch || []).find((b) => b.kind === "learn");
  assertEquals(learn.state.object, 79, "apple, not three");
  assertEquals(learn.state.quantity, 3);
  forget();
});

test("forgetting drops the state, and the brain says so", async () => {
  forget();
  await brain("basket has three apple");
  assertEquals(await says("basket has how many apple?"), "three");
  forget();
  assertEquals(await says("basket has how many apple?"), "I don't know.");
});

test("counting a kind still counts the world, not any state", async () => {
  forget();
  await brain("basket has three apple");
  assertEquals(await says("how many fruit?"), "five", "unchanged by the basket");
  forget();
});

test("what a thing holds is state; what it is stays permanent", async () => {
  forget();
  assertEquals(await says("a basket is an object?"), "Yes.");
  await brain("basket has two apple");
  assertEquals(await says("a basket is an object?"), "Yes.", "state did not disturb kind");
  forget();
});

test("an action works on what a thing holds", async () => {
  forget();
  await brain("basket has three apple");
  const r = await brain("take one apple from basket");
  const did = (r.roots[0].branch || []).find((b) => b.kind === "did");
  assertEquals(did.state.before, 3);
  assertEquals(did.state.amount, 1);
  assertEquals(did.state.after, 2);
  assertEquals(r.expression.state.says, "two");
  assertEquals(await says("basket has how many apple?"), "two");
  forget();
});

test("what an action does is the world's to say, the arithmetic is the brain's", async () => {
  forget();
  await brain("basket has two apple");
  const took = await brain("take one apple from basket");
  const gave = await brain("give three apple to basket");
  // take links to minus and give to plus in the world; nothing in the engine
  // knows what either word means.
  assertEquals((took.roots[0].branch || []).find((b) => b.kind === "did").state.after, 1);
  assertEquals((gave.roots[0].branch || []).find((b) => b.kind === "did").state.after, 4);
  forget();
});

test("taking more than is there is refused, and leaves the state alone", async () => {
  forget();
  await brain("basket has one apple");
  const r = await brain("take three apple from basket");
  assertEquals((r.roots[0].branch || []).find((b) => b.kind === "did").state.after, -2);
  assertEquals((r.roots[0].branch || []).find((b) => b.kind === "refuse").name, "beyond");
  assertEquals(r.learned, null, "a state the world cannot name is not held");
  assertEquals(r.expression.state.says, "No.");
  assertEquals(await says("basket has how many apple?"), "one", "untouched");
  forget();
});

test("an action on a thing holding nothing known does nothing", async () => {
  forget();
  const r = await brain("take one apple from basket");
  assertEquals((r.roots[0].branch || []).find((b) => b.kind === "did"), undefined);
  assertEquals(r.learned, null);
  forget();
});

test("state belongs to something that exists once, not to its kind", async () => {
  forget();
  const r = await brain("basket has three apple");
  const made = r.learned.terms[0];
  assertEquals(made.individual, true);
  assert(/^basket#\d+$/.test(made.name), "one basket, named after the kind it is one of");
  assert(made.links.some((l) => l.to === 307), "and it is a basket");
  forget();
});

test("the kind is left holding nothing", async () => {
  forget();
  await brain("basket has three apple");
  assertEquals(await says("a basket is an object?"), "Yes.", "the kind is untouched");
  assertEquals(await says("how many container?"), "one", "one kind of container, not two");
  forget();
});

test("the same thing is spoken of again, not a second one", async () => {
  forget();
  await brain("basket has three apple");
  const again = await brain("basket has three apple");
  assertEquals(again.learned, null, "nothing new");
  await brain("basket has two apple");
  assertEquals(await says("basket has how many apple?"), "two", "the same basket, revised");
  forget();
});

test("an action works on the thing, not on the kind", async () => {
  forget();
  await brain("basket has three apple");
  const r = await brain("take one apple from basket");
  const made = r.learned.terms[0];
  assert(made.id !== 307, "the basket that exists, not basket the kind");
  assert(/^basket#/.test(made.name));
  forget();
});

test("a introduces one, and the means the one already there", async () => {
  forget();
  const first = await brain("a basket has three apple");
  assert(/^basket#\d+$/.test(first.learned.terms[0].name));
  assertEquals(await says("the basket has how many apple?"), "three");
  forget();
});

test("a second `a` makes a second one, not a revision of the first", async () => {
  forget();
  const one = await brain("a basket has three apple");
  const two = await brain("a basket has two apple");
  assertEquals(two.learned.terms[0].id, one.learned.terms[0].id + 1,
    "another basket, not the same one again");
  forget();
});

test("with two of them, `the` means nothing and the brain does not pick", async () => {
  forget();
  await brain("a basket has three apple");
  await brain("a basket has two apple");
  assertEquals(await says("the basket has how many apple?"), "I don't know.");
  forget();
});

test("a claim about kind makes nothing, marked or not", async () => {
  forget();
  const r = await brain("a basket is an object?");
  assertEquals(r.learned, null, "nothing exists once merely by being spoken of");
  assertEquals(await says("how many container?"), "one");
  forget();
});

test("which word marks which is the language's, not the brain's", async () => {
  forget();
  // `a` and `an` both mark a new one; only the language file says so.
  const r = await brain("an basket has three apple");
  assertEquals(r.learned.terms[0].individual, true);
  forget();
});

test("state is stamped with when it became so", async () => {
  forget();
  const first = await brain("a basket has three apple");
  const stamped = first.learned.terms[0].links.find((l) => l.at !== undefined);
  assertEquals(stamped.at, 0, "the clock starts at nothing having happened");
  const next = await brain("take one apple from the basket");
  assertEquals(next.learned.terms[0].links[0].at, 1, "and ticks on what happens");
  forget();
});

test("revising a count does not erase what was so before it", async () => {
  forget();
  await brain("a basket has three apple");
  await brain("take one apple from the basket");
  await brain("give two apples to the basket");
  assertEquals(await says("the basket has how many apples?"), "four", "the latest stands");
  forget();
});

test("the clock ticks on what happens, not on being spoken to", async () => {
  forget();
  await brain("a basket has three apple");
  await brain("a tiger is a mammal?");
  await brain("how many mammals?");
  const r = await brain("take one apple from the basket");
  assertEquals(r.learned.terms[0].links[0].at, 1, "questions are not events");
  forget();
});
