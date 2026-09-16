import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

const { brain, forget } = openBrain("sqlite::memory:");
const says = async (q) => (await brain(q)).expression.state.says;

test("a fraction is so many parts of so many, and the engine names none of them", async () => {
  // The world says which fractions it has and what each one is; the brain
  // knows only that a fraction takes parts out of a whole.
  await forget();
  assertEquals(await says("what is one-fourth of 120?"), "30");
  assertEquals(await says("what is one-third of 120?"), "40");
  assertEquals(await says("what is two-thirds of 120?"), "80");
  assertEquals(await says("what is three-quarters of 120?"), "90");
  assertEquals(await says("what is one-tenth of 120?"), "12");
});

test("halving and doubling still work, being fractions among the rest", async () => {
  await forget();
  assertEquals(await says("what is half of 120?"), "60");
  assertEquals(await says("what is double of 120?"), "240");
});

test("a fraction of a number the whole does not divide is exact", async () => {
  await forget();
  assertEquals(await says("what is one-fourth of 10?"), "2.5");
});

test("a fraction of what this conversation holds is a count", async () => {
  await forget();
  await brain("a shop has 120 apples");
  assertEquals(await says("what is one-fourth of the apples?"), "30");
  assertEquals(await says("what is half of the apples?"), "60");
});

test("a doing is not a sum to be worked out", async () => {
  // `the shop sold 30 apples` says something happened; answering thirty would
  // answer a question nobody asked and take nothing in.
  await forget();
  await brain("a shop has 120 apples");
  assertEquals((await brain("the shop sold 30 apples")).expression.name, "learn");
  assertEquals(await says("how many apples does the shop have?"), "ninety");
});
