import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");

async function fresh(...said) {
  await forget();
  let last;
  for (const s of said) last = await brain(s);
  return last;
}

test("a question may turn its joint to the front over any relation", async () => {
  // `is a cat an animal?` was read and `is a wheel part of a cart?` was not:
  // a signal could put the joint first over a kind and nowhere else.
  assertEquals(
    (await fresh("a wheel is part of a cart", "is a wheel part of a cart?")).expression.name,
    "affirm",
  );
  assertEquals(
    (await fresh("tom is the father of sam", "is tom the father of sam?")).expression.name,
    "affirm",
  );
  await forget();
});

test("and answers no where it should", async () => {
  assertEquals(
    (await fresh("a wheel is part of a cart", "is a cart part of a wheel?")).expression.name,
    "deny",
  );
  assertEquals(
    (await fresh("is a wheel part of a barrel?")).expression.name,
    "unsure",
    "nobody said so, and not being told is not being told otherwise",
  );
  await forget();
});

test("the shapes it already read are unchanged", async () => {
  assertEquals((await fresh("is a cat an animal?")).expression.name, "affirm");
  assertEquals((await fresh("is a cat a fish?")).expression.name, "deny");
  assertEquals(
    (await fresh("a wheel is part of a cart", "a wheel is part of a cart?")).expression.name,
    "affirm",
  );
  await forget();
});
