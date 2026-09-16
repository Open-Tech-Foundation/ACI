import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

const { brain, forget } = openBrain("sqlite::memory:");
const says = async (q) => (await brain(q)).expression.state.says;

test("one thing handed on is held by whoever it reached", async () => {
  await forget();
  await brain("john gave the key to sam");
  assertEquals(await says("who has the key?"), "sam");
});

test("handed on again, it is the last hand that holds it", async () => {
  await forget();
  await brain("john gave the key to sam");
  await brain("sam gave the key to mary");
  assertEquals(await says("who has the key?"), "mary");
  assertEquals(await says("does mary have a key?"), "Yes. ✅ mary has a key.");
});

test("whoever gave away the one they had has none", async () => {
  await forget();
  await brain("john gave the key to sam");
  await brain("sam gave the key to mary");
  assertEquals(await says("does sam have a key?"), "No. ❌");
  assertEquals(await says("how many keys does sam have?"), "zero");
});

test("a counted handing still reads as it did", async () => {
  await forget();
  await brain("sam has 5 books");
  await brain("sam gives 2 books to jerry");
  assertEquals(await says("how many books does sam have?"), "three");
  assertEquals(await says("how many books does jerry have?"), "two");
});

test("a word that says which one is not what the question asks after", async () => {
  await forget();
  await brain("the ball is red");
  await brain("the ball is small");
  assertEquals(await says("what colour is the small ball?"), "red");
  assertEquals(await says("what colour is the ball?"), "red");
  assertEquals(await says("is the small ball red?"), "Yes. ✅ a ball is red.");
});

test("the hole says which word narrows and which answers", async () => {
  // `fruit` narrows here and answers in `what is a wren?`. Nothing about the
  // word says which; the hole does — asked for a thing, a property tells it
  // apart and a kind restricts it.
  await forget();
  await brain("the apple is red");
  await brain("the banana is yellow");
  assertEquals(await says("which fruit is yellow?"), "banana");
  assertEquals(await says("which fruit is red?"), "apple");
  assertEquals(await says("what is yellow?"), "banana");
  assertEquals(await says("what is a wren?"), "bird");
});

test("a question read whole that finds nothing knows of none", async () => {
  await forget();
  await brain("the crow is black");
  await brain("the swan is white");
  assertEquals(await says("which bird is white?"), "swan");
  assertEquals(await says("which animal is black?"), "crow");
  assertEquals(await says("which bird is yellow?"), "I don't know.");
});
