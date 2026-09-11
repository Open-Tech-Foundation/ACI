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
  const told = await fresh("ice is a liquid");
  assertEquals(told.expression.name, "learn");
  assert(told.learned != null, "said outright, it was taken in");
  const ICE = 72;
  const LIQUID = 20;
  assert(
    told.learned.terms.some((t) => t.id === ICE && t.links.some((l) => l.to === LIQUID)),
    "said outright, ice was made a liquid",
  );

  const spoken = await fresh("i know that ice is a liquid");
  assert(
    !spoken.learned.terms.some((t) => t.id === ICE),
    "spoken of, nothing was said about ice",
  );
  // What was taken in is about the sender: they hold a claim, and the claim is
  // a thing of its own rather than anything about ice.
  const claim = spoken.learned.terms.find((t) => t.name.startsWith("claim#"));
  assert(claim != null, "the claim is written down as a thing");
  assert(
    spoken.learned.terms.some((t) => t.links.some((l) => l.to === claim.id)),
    "and somebody is joined to it",
  );
  await forget();
});

test("a claim spoken of is still checked", async () => {
  assertEquals((await fresh("i know that a mango is a fruit")).expression.name, "understood");
  assertEquals((await fresh("i know that a mango is a hammer")).expression.name, "deny");
  assertEquals((await fresh("i know that ice is a liquid")).expression.name, "unsure");
  await forget();
});

test("the claim it disagrees with was never refused as the sender's own", async () => {
  const r = await fresh("i know that a mango is a hammer");
  const refused = (r.roots[0].branch || []).some((b) => b.kind === "refuse");
  assertEquals(refused, false, "nothing was turned down — nothing was offered");
  await forget();
});

test("what the brain reached about the claim stands on the tree", async () => {
  const r = await fresh("i know that a mango is a fruit");
  const stood = (r.roots[0].branch || []).find((b) => b.kind === "standing");
  assert(stood != null, "it checked the claim it was told about");
  assertEquals(stood.name, "held");
  await forget();
});

test("nothing of the walking to the claim is kept, only what it came to", async () => {
  const r = await fresh("i know that ice is a liquid");
  const kinds = (r.roots[0].branch || []).map((b) => b.kind);
  assert(!kinds.includes("learn"), "a claim spoken of teaches nothing");
  await forget();
});

test("a signal with no claim spoken of is unchanged", async () => {
  assertEquals((await fresh("a mango is a fruit")).expression.name, "understood");
  assertEquals((await fresh("a mango is a hammer")).expression.name, "conflict");
  const taught = await fresh("ice is a liquid");
  assert(taught.learned != null);
  await forget();
});

test("a claim is a thing a relation can reach", async () => {
  // Until now only `because` reached a claim, and only because the reading
  // that makes claims built both ends of it. Any relation reaches one.
  const r = await fresh("i know that a mango is a fruit");
  const claim = r.learned.terms.find((t) => t.name.startsWith("claim#"));
  assert(claim != null, "the claim is a thing of its own");
  // Its subject, its object, and the relation it claims.
  assertEquals(claim.links.length, 3);
  const holder = r.learned.terms.find((t) => t.links.some((l) => l.to === claim.id));
  assert(holder != null, "and somebody holds it");
  await forget();
});

test("knowing is knowing something that is so", async () => {
  // The brain stands against the claim, so there is nothing about the sender
  // to keep: they did not know it.
  const wrong = await fresh("i know that a mango is a hammer");
  assertEquals(wrong.expression.name, "deny");
  assertEquals(wrong.learned, null);
  await forget();
});

test("asked about a claim, the question is about whoever holds it", async () => {
  await forget();
  // A mango is a fruit whatever anybody knows, so answering that is answering
  // a question nobody asked. Nobody has said they know it.
  assertEquals(
    (await brain("do i know that a mango is a fruit?", { from: PERSON })).expression.name,
    "unsure",
  );
  assertEquals(
    (await brain("a mango is a fruit?", { from: PERSON })).expression.name,
    "affirm",
    "asked plainly, it is still about the mango",
  );
  await forget();
});

test("what was said of a claim is what answers about it", async () => {
  await forget();
  await brain("i know that a mango is a fruit", { from: PERSON });
  assertEquals(
    (await brain("do i know that a mango is a fruit?", { from: PERSON })).expression.name,
    "affirm",
  );
  assertEquals(
    (await brain("do i know that a mango is a food?", { from: PERSON })).expression.name,
    "unsure",
    "a claim nobody wrote down is one nobody holds",
  );
  await forget();
});

test("a hole may stand where the holder does", async () => {
  await forget();
  await brain("i know that a mango is a fruit", { from: PERSON });
  assertEquals(
    (await brain("who knows that a mango is a fruit?", { from: PERSON })).expression.state.says,
    "person",
  );
  await forget();
});
