import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");

// Every test here owns entities no other test touches, so nothing one learns
// can be seen by another whatever order they run in.
const says = async (q) => (await brain(q)).expression.state.says;
// The words are the language's; the act is the brain's.
const act = async (q) => (await brain(q)).expression.name;
const refusal = (r) => {
  const n = (r.roots[0].branch || []).find((b) => b.kind === "refuse");
  return n ? n.name : null;
};

test("a fact told is a fact kept", async () => {
  assertEquals(await says("a stork has a wing?"), "I don't know.");
  await brain("a stork has a wing");
  assertEquals(await act("a stork has a wing?"), "affirm");
});

test("what was learned can then be asked about", async () => {
  assertEquals(await says("a crow has what?"), "none");
  await brain("a crow has a feather");
  assertEquals(await says("a crow has what?"), "feather");
});

test("learning changes what follows from the world, not only the fact itself", async () => {
  assertEquals(await says("left is a state?"), "I don't know.");
  await brain("left is a feeling");
  assertEquals(
    await act("left is a state?"), "affirm",
    "feeling -> state was already known; the taught link reaches through it",
  );
});

test("what the world excludes cannot be taught", async () => {
  const r = await brain("a pigeon is a lizard");
  assertEquals(refusal(r), "contradiction", "a bird is not a reptile");
  assertEquals(r.learned, null);
});

test("a claim that would close a loop is never kept", async () => {
  // speed and weight are both properties, and nothing says a property may be
  // only one of them — so the first claim is taken and the second loops.
  await brain("a speed is a weight");
  const back = await brain("a weight is a speed");
  assertEquals(refusal(back), "loop");
  assertEquals(back.learned, null);
});

test("asking never teaches", async () => {
  await brain("an owl has a claw?");
  assertEquals(await says("an owl has a claw?"), "I don't know.");
});

test("two brains over two stores cannot reach each other", async () => {
  const one = openBrain("sqlite::memory:");
  const other = openBrain("sqlite::memory:");

  await one.brain("a chair has five cup");
  assertEquals((await one.brain("the chair has how many cups?")).expression.state.says, "five");
  assertEquals(
    (await other.brain("the chair has how many cups?")).expression.state.says,
    "I don't know.",
    "the other brain was never told",
  );
});

test("forgetting reaches only the brain it was asked of", async () => {
  const one = openBrain("sqlite::memory:");
  const other = openBrain("sqlite::memory:");
  await one.brain("a table has three lamp");
  await other.brain("a table has seven lamp");

  await one.forget();
  assertEquals((await one.brain("the table has how many lamps?")).expression.state.says,
    "I don't know.");
  assertEquals((await other.brain("the table has how many lamps?")).expression.state.says,
    "seven", "untouched");
});
