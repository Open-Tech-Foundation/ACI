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
