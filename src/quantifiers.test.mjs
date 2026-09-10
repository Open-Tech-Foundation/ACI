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

// A word that narrows which one was meant is still true of the one that was
// meant. Saying a thing is a big cat says it is a cat and says it is big: the
// narrowing picks out which cat, and for a particular cat that is a thing it
// is. Narrowing the one a claim is merely *about* says nothing new about the
// narrowing itself.
test("a thing said to be a narrowed kind is both", async () => {
  const brain = fresh();
  await brain("tilly is a big cat", P);
  assertEquals((await brain("is tilly a cat?", P)).expression.name, "affirm", "the kind");
  assertEquals((await brain("is tilly big?", P)).expression.name, "affirm", "and the narrowing");
});

test("the narrowing reaches what the kind reaches", async () => {
  const brain = fresh();
  await brain("tilly is a big cat", P);
  assertEquals(
    (await brain("is tilly an animal?", P)).expression.name,
    "affirm",
    "a cat is an animal, and tilly is still a cat",
  );
});

test("a denied claim narrows nothing", async () => {
  const brain = fresh();
  await brain("tilly is not a big cat", P);
  assert(
    (await brain("is tilly big?", P)).expression.name !== "affirm",
    "denying she is a big cat must not say she is big",
  );
});

// Asked how many of a kind there are, the answer is how many there are. Two
// boxes of four balls are eight balls, and which box was spoken of last does
// not change that. Only what exists once is added up: a kind carrying a count
// says how many any of them has, and adding those across the world would be
// counting hands nobody mentioned.
test("a kind is counted across everything that holds it", async () => {
  const brain = fresh();
  await brain("a box has 4 balls", P);
  await brain("a box has 3 balls", P);
  assertEquals((await brain("how many balls?", P)).expression.state.says, "seven");
  assertEquals((await brain("how many boxes?", P)).expression.state.says, "two");
});

test("what one thing holds is still asked for by saying so", async () => {
  const brain = fresh();
  await brain("a shop has 5 bats and two balls", P);
  assertEquals((await brain("the shop has how many things?", P)).expression.state.says, "seven");
});

test("a count on a kind is not added up across the world", async () => {
  // The world says what any one of a kind holds. Adding those would count
  // things nobody has spoken of at all.
  const brain = fresh();
  await brain("a box has 4 balls", P);
  assertEquals((await brain("how many balls?", P)).expression.state.says, "four");
});

test("a word saying how many, with no amount behind it, settles nothing", async () => {
  const brain = fresh();
  await brain("kiran is a person");
  await brain("kiran has 20 books");
  // The world says `many` is a quantity and says no more. Whether twenty is
  // many is not something the brain was told, and whether she holds a book at
  // all is a different question.
  assertEquals((await brain("does kiran have many books?")).expression.name, "unsure");
  assertEquals((await brain("does kiran have a book?")).expression.name, "affirm");
});
