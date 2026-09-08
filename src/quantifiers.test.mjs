import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

const P = { from: 29 };
const fresh = () => openBrain("sqlite::memory:").brain;

test("said of all of a kind, it is said of each thing that is one", async () => {
  const brain = fresh();
  await brain("all cats are white", P);
  await brain("Tom is a cat", P);
  assertEquals((await brain("is Tom white?", P)).expression.name, "affirm");
});

test("denied of all of a kind, it is denied of each", async () => {
  const brain = fresh();
  await brain("no cats are white", P);
  await brain("Tom is a cat", P);
  assertEquals((await brain("is Tom white?", P)).expression.name, "deny");
});

test("said of some of them, it is said of none in particular", async () => {
  // Saying it of some makes one of them and says it of that one. Nothing
  // reaches the kind, so nothing reaches Tom, who is a different one.
  const brain = fresh();
  await brain("some cats are white", P);
  await brain("Tom is a cat", P);
  assertEquals((await brain("is Tom white?", P)).expression.name, "unsure");
});

test("every says what all says", async () => {
  const brain = fresh();
  await brain("every cat is white", P);
  await brain("Tom is a cat", P);
  assertEquals((await brain("is Tom white?", P)).expression.name, "affirm");
});

test("it reaches down a ladder, not only one rung", async () => {
  const brain = fresh();
  await brain("all animals are white", P);
  await brain("Tom is a cat", P);
  assertEquals(
    (await brain("is Tom white?", P)).expression.name,
    "affirm",
    "a cat is an animal, so what holds of animals holds of Tom",
  );
});

test("what is said of one of a kind is not said of the kind", async () => {
  const brain = fresh();
  await brain("Tom is a cat", P);
  await brain("Tom is white", P);
  assertEquals(
    (await brain("are all cats white?", P)).expression.name,
    "unsure",
    "one white cat says nothing of the rest",
  );
});
