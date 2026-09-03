import { test, assert, assertEquals } from "runtime:test";
import { brain, forget } from "./index.js";

test("a fact told is a fact kept", async () => {
  forget();
  assertEquals((await brain("a cat has a mind?")).expression.state.says, "No.");
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
  await brain("a bird is a person");
  assertEquals(
    (await brain("a bird is a human?")).expression.state.says,
    "Yes.",
    "person -> human was already known; the new link reaches it",
  );
  forget();
});

test("forgetting returns the brain to what it was born and taught", async () => {
  forget();
  await brain("a cat has a mind");
  assertEquals((await brain("a cat has a mind?")).expression.state.says, "Yes.");
  forget();
  assertEquals((await brain("a cat has a mind?")).expression.state.says, "No.");
});

test("a refused claim is never kept", async () => {
  forget();
  await brain("a human is a person");
  assertEquals((await brain("a human is a person?")).expression.state.says, "No.");
  forget();
});

test("asking never teaches", async () => {
  forget();
  await brain("a cat has a mind?");
  assertEquals((await brain("a cat has a mind?")).expression.state.says, "No.");
  forget();
});
