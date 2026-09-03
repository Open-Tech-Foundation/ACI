import { test, assert, assertEquals } from "runtime:test";
import { brain, forget } from "./index.js";

test("a fact told is a fact kept", async () => {
  forget();
  assertEquals((await brain("a cat has a mind?")).expression.state.says, "I don't know.");
  await brain("a cat has a mind");
  assertEquals((await brain("a cat has a mind?")).expression.state.says, "Yes.");
  forget();
});

test("what was learned can then be asked about", async () => {
  forget();
  assertEquals((await brain("a cat has what?")).expression.name, "unknown");
  await brain("a cat has a mind");
  assertEquals((await brain("a cat has what?")).expression.state.says, "mind");
  forget();
});

test("learning changes what follows from the world, not only the fact itself", async () => {
  forget();
  assertEquals((await brain("a moon is a tool?")).expression.state.says, "I don't know.");
  await brain("a moon is a computer");
  assertEquals(
    (await brain("a moon is a tool?")).expression.state.says,
    "Yes.",
    "computer -> tool was already known; the taught link reaches through it",
  );
  forget();
});

test("what the world excludes cannot be taught", async () => {
  forget();
  const r = await brain("a sparrow is a tiger");
  assertEquals(kind(r), "contradiction", "a bird is not a mammal");
  assertEquals(r.learned, null);
  forget();
});

function kind(r) {
  const n = (r.roots[0].branch || []).find((b) => b.kind === "refuse");
  return n ? n.name : null;
}

test("forgetting returns the brain to what it was born and taught", async () => {
  forget();
  await brain("a cat has a mind");
  assertEquals((await brain("a cat has a mind?")).expression.state.says, "Yes.");
  forget();
  assertEquals((await brain("a cat has a mind?")).expression.state.says, "I don't know.");
});

test("a claim that would close a loop is never kept", async () => {
  forget();
  await brain("a human is a person");
  assertEquals((await brain("a human is a person?")).expression.state.says, "I don't know.");
  forget();
});

test("a contradicted claim is never kept", async () => {
  forget();
  const r = await brain("a cat is a number");
  assertEquals(r.learned, null, "the world says a cat cannot be one");
  assertEquals(r.expression.state.says, "No.");
  assertEquals((await brain("cat")).expression.name, "recognise", "and nothing downstream moved");
  forget();
});

test("asking never teaches", async () => {
  forget();
  await brain("a cat has a mind?");
  assertEquals((await brain("a cat has a mind?")).expression.state.says, "I don't know.");
  forget();
});
