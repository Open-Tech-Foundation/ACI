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

test("one thing standing to the left of another is an ordering", async () => {
  // `left` was a side something is on and nothing more, so saying one thing
  // was left of another wrote nothing down at all.
  assertEquals(
    (await fresh("a lamp is left of a crate", "a lamp is left of a crate?")).expression.name,
    "affirm",
  );
  await forget();
});

test("an ordering runs through", async () => {
  assertEquals(
    (await fresh(
      "a lamp is left of a crate",
      "a crate is left of a barrel",
      "a lamp is left of a barrel?",
    )).expression.name,
    "affirm",
    "nobody said anything about that pair",
  );
  await forget();
});

test("and runs one way, from either end", async () => {
  const said = ["a lamp is left of a crate", "a crate is left of a barrel"];
  assertEquals((await fresh(...said, "a barrel is left of a lamp?")).expression.name, "deny");
  assertEquals(
    (await fresh(...said, "a barrel is right of a lamp?")).expression.name,
    "affirm",
    "one fact, read from the other end",
  );
  assertEquals(
    (await fresh(...said, "a lamp is left of a lamp?")).expression.name,
    "deny",
    "nothing stands to the left of itself",
  );
  await forget();
});

test("a name stands in it the same as a kind", async () => {
  assertEquals(
    (await fresh("x is left of y", "y is left of z", "x is left of z?")).expression.name,
    "affirm",
  );
  await forget();
});

test("a side is still a side", async () => {
  // `left` on its own says which side a thing is on, and only `of` after it
  // makes it one thing standing to another.
  await forget();
  await brain("left is a feeling");
  assertEquals((await brain("left is a state?")).expression.name, "affirm");
  await forget();
});
