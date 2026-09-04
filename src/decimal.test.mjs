import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");
const says = async (said) => {
  await forget();
  return (await brain(said)).expression.state.says;
};

test("a tenth and two tenths make three tenths", async () => {
  // A machine that counts in halves cannot hold a tenth. The four operations
  // that have an exact answer are worked in whole parts, so what the brain
  // comes to is the number and not something a hair beside it.
  assertEquals(await says("0.1+0.2"), "0.3");
  assertEquals(await says("0.7 - 0.6"), "0.1");
  assertEquals(await says("0.1 * 3"), "0.3");
  await forget();
});

test("what it works out, it can match", async () => {
  // It said 0.3 and then denied that 0.1+0.2 was 0.3, which is a brain that
  // cannot agree with itself.
  assertEquals(await says("0.1+0.2 = 0.3"), "Yes. ✅");
  assertEquals(await says("0.3 - 0.1 = 0.2"), "Yes. ✅");
  assertEquals(await says("0.1 * 3 = 0.3"), "Yes. ✅");
  await forget();
});

test("whole numbers are unchanged", async () => {
  assertEquals(await says("1+2 = 3"), "Yes. ✅");
  assertEquals(await says("7 divide 2"), "3.5");
  assertEquals(await says("2 ^ 10"), "1024");
  await forget();
});

test("what has no exact answer is worked as closely as it can be", async () => {
  // A third has no end, and the language says how far it is written.
  assertEquals(await says("1 divide 3"), "0.3333333333");
  await forget();
});

test("each side of a comparison is worked out on its own", async () => {
  // What is compared is what each side comes to, not the nearest number
  // standing in it.
  assertEquals(await says("0.1+0.2 > 0.3?"), "No. ❌");
  assertEquals(await says("1+1 > 1?"), "Yes. ✅");
  assertEquals(await says("is 0.1+0.2 greater than 0.29?"), "Yes. ✅");
  await forget();
});

test("an operation is worked out, not joined across", async () => {
  // In `1+1 > 1` the joint is the comparing; the adding is one of the sides.
  assertEquals(await says("2+2 > 3?"), "Yes. ✅");
  assertEquals(await says("2+2 = 4?"), "Yes. ✅");
  await forget();
});
