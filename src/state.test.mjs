import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");

// Every test owns a container and a thing no other test touches, so none of
// them can see what another learned, whatever order they run in.
const says = async (q) => (await brain(q)).expression.state.says;
// The words are the language's; the act is the brain's.
const act = async (q) => (await brain(q)).expression.name;
const branch = (r, kind) => (r.roots[0].branch || []).find((b) => b.kind === kind) || null;

test("a thing can hold a number of something, and the brain remembers", async () => {
  assertEquals(await says("the cupboard has how many cups?"), "I don't know.");
  await brain("a cupboard has three cup");
  assertEquals(await says("the cupboard has how many cups?"), "three");
});

test("a different count is a change of state, not a contradiction", async () => {
  await brain("a bench has three pen");
  const again = await brain("the bench has two pen");
  assert(again.learned !== null, "it takes the new count");
  assertEquals(branch(again, "refuse"), null);
  assertEquals(await says("the bench has how many pens?"), "two");
});

test("telling it the same count again changes nothing", async () => {
  await brain("a boat has four rope");
  assertEquals((await brain("the boat has four rope")).learned, null);
});

test("a number spent counting is not one of the things being spoken about", async () => {
  const r = await brain("a truck has six key");
  const learn = branch(r, "learn");
  assert(learn !== null);
  assertEquals(learn.state.quantity, 6);
});

test("state belongs to something that exists once, not to its kind", async () => {
  const r = await brain("a tower has five lamp");
  const made = r.learned.terms.find((t) => /^tower#/.test(t.name));
  assertEquals(made.individual, true);
  assertEquals(await act("a tower is a building?"), "affirm", "the kind is untouched");
});

test("a introduces one, a second `a` makes a second one", async () => {
  const one = await brain("a market has two comb");
  const two = await brain("a market has three comb");
  const first = one.learned.terms.find((t) => /^market#/.test(t.name));
  const second = two.learned.terms.find((t) => /^market#/.test(t.name));
  assert(second.id > first.id, "another market, not the same one again");
  assertEquals(await says("the market has how many combs?"), "I don't know.",
    "with two of them there is no `the` to resolve");
});

test("a claim about kind makes nothing, marked or not", async () => {
  assertEquals((await brain("a needle is a tool?")).learned, null);
});

test("state is stamped with when it became so", async () => {
  const r = await brain("a shop has seven plate");
  const stamped = r.learned.terms
    .flatMap((t) => t.links)
    .find((l) => l.at !== undefined);
  assert(Number.isInteger(stamped.at), "the moment it became so");
});

test("an action works on what a thing holds", async () => {
  await brain("a cave holds eight axe");
  const r = await brain("take three axes from the cave");
  const did = branch(r, "did");
  assertEquals(did.state.before, 8);
  assertEquals(did.state.after, 5);
  assertEquals(r.expression.state.says, "five");
  assertEquals(await says("the cave holds how many axes?"), "five");
});

test("what an action does is the world's to say, the arithmetic is the brain's", async () => {
  await brain("a pond holds two brush");
  const gave = await brain("give six brushes to the pond");
  assertEquals(branch(gave, "did").state.after, 8);
  assertEquals(await says("the pond holds how many brushes?"), "eight");
});

test("taking more than is there is refused, and leaves the state alone", async () => {
  await brain("a bag holds two saw");
  const r = await brain("take nine saws from the bag");
  assertEquals(branch(r, "refuse").name, "beyond");
  assertEquals(r.learned, null);
  assertEquals(r.expression.name, "deny");
  assertEquals(await says("the bag holds how many saws?"), "two", "untouched");
});

test("what the brain refuses is not recorded as having happened", async () => {
  await brain("a bottle holds one spoon");
  const r = await brain("take four spoons from the bottle");
  assertEquals(branch(r, "event"), null);
});

test("an action whose effect it cannot tell is still recorded as having happened", async () => {
  const r = await brain("take one fork from the school");
  assertEquals(branch(r, "did"), null, "it worked nothing out");
  assert(branch(r, "event") !== null, "but it was told something happened");
});

test("what happened is a thing that happened once, with a moment", async () => {
  await brain("a house holds nine book");
  const r = await brain("take two books from the house");
  const event = branch(r, "event");
  assert(/^take#\d+$/.test(event.name));
  assert(Number.isInteger(event.state.at));
  assertEquals(r.learned.terms.find((t) => /^take#/.test(t.name)).individual, true);
});

test("things play parts in what happened", async () => {
  await brain("a temple holds five mirror");
  const parts = branch(await brain("take one mirror from the temple"), "event").state.parts;
  const patient = parts.find((p) => p.amount === 1);
  assertEquals(patient.of, (await termOf("mirror")), "the mirror was taken");
  assert(parts.length >= 2, "and it came from somewhere");
});

test("giving works on its destination, taking on its source", async () => {
  await brain("a bridge holds three ladder");
  await brain("take one ladder from the bridge");
  assertEquals(await says("the bridge holds how many ladders?"), "two");
  await brain("give five ladders to the bridge");
  assertEquals(await says("the bridge holds how many ladders?"), "seven");
});

test("counting a kind counts the world, not any state", async () => {
  await brain("a hospital has four clock");
  assertEquals(await says("how many season?"), "four", "unchanged by the hospital");
});

async function termOf(word) {
  const r = await brain(word);
  const t = (r.roots[0].branch || []).find((b) => b.kind === "thought");
  return t.state.thought.concept;
}
