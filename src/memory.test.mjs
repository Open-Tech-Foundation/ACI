import { test, assert, assertEquals } from "runtime:test";
import { brain } from "./index.js";

// Every test here owns entities no other test touches, so nothing one learns
// can be seen by another whatever order they run in.
const says = async (q) => (await brain(q)).expression.state.says;
const refusal = (r) => {
  const n = (r.roots[0].branch || []).find((b) => b.kind === "refuse");
  return n ? n.name : null;
};

test("a fact told is a fact kept", async () => {
  assertEquals(await says("a stork has a wing?"), "I don't know.");
  await brain("a stork has a wing");
  assertEquals(await says("a stork has a wing?"), "Yes.");
});

test("what was learned can then be asked about", async () => {
  assertEquals((await brain("a crow has what?")).expression.name, "unknown");
  await brain("a crow has a feather");
  assertEquals(await says("a crow has what?"), "feather");
});

test("learning changes what follows from the world, not only the fact itself", async () => {
  assertEquals(await says("left is a state?"), "I don't know.");
  await brain("left is a feeling");
  assertEquals(
    await says("left is a state?"),
    "Yes.",
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
