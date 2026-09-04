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

test("a claim spoken of is not a claim made", async () => {
  // Said outright, the brain takes it in. Spoken of, it does not — saying you
  // know something is not telling the brain it is so, and asserting it would
  // be putting words in the sender's mouth.
  const told = await fresh("a story is art");
  assertEquals(told.expression.name, "learn");
  assert(told.learned != null, "said outright, it was taken in");

  const spoken = await fresh("i know that a story is art");
  assertEquals(spoken.learned, null, "spoken of, nothing was taken in");
  await forget();
});

test("a claim spoken of is still checked", async () => {
  assertEquals((await fresh("i know that a cat is an animal")).expression.name, "understood");
  assertEquals((await fresh("i know that a cat is a dog")).expression.name, "deny");
  assertEquals((await fresh("i know that a story is art")).expression.name, "unsure");
  await forget();
});

test("the claim it disagrees with was never refused as the sender's own", async () => {
  const r = await fresh("i know that a cat is a dog");
  const refused = (r.roots[0].branch || []).some((b) => b.kind === "refuse");
  assertEquals(refused, false, "nothing was turned down — nothing was offered");
  await forget();
});

test("what the brain reached about the claim stands on the tree", async () => {
  const r = await fresh("i know that a cat is an animal");
  const stood = (r.roots[0].branch || []).find((b) => b.kind === "standing");
  assert(stood != null, "it checked the claim it was told about");
  assertEquals(stood.name, "held");
  await forget();
});

test("nothing of the walking to the claim is kept, only what it came to", async () => {
  const r = await fresh("i know that a story is art");
  const kinds = (r.roots[0].branch || []).map((b) => b.kind);
  assert(!kinds.includes("learn"), "a claim spoken of teaches nothing");
  await forget();
});

test("a signal with no claim spoken of is unchanged", async () => {
  assertEquals((await fresh("a cat is an animal")).expression.name, "understood");
  assertEquals((await fresh("a cat is a dog")).expression.name, "deny");
  const taught = await fresh("a story is art");
  assert(taught.learned != null);
  await forget();
});
