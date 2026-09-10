import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// An ordering is places, and what is asked of it is arithmetic on those. The
// world says the chain — monday comes before tuesday, tuesday before
// wednesday — and nobody has to say anything about monday and wednesday for
// the brain to answer about them.

const { brain, forget } = openBrain("sqlite::memory:");
const said = async (s) => (await brain(s, { from: 29 })).expression.name;

test("one thing stands before another where it stands first of the two", async () => {
  await forget();
  assertEquals(await said("is monday before tuesday?"), "affirm");
  assertEquals(await said("is monday before wednesday?"), "affirm", "nobody said this pair");
  assertEquals(await said("is january before march?"), "affirm");
  await forget();
});

test("and the places settle it the other way too, rather than leaving it open", async () => {
  await forget();
  assertEquals(await said("is tuesday before monday?"), "deny");
  assertEquals(await said("is march before january?"), "deny");
  await forget();
});

test("the same ordering read from the far end runs the other way", async () => {
  await forget();
  assertEquals(await said("is tuesday after monday?"), "affirm");
  await forget();
});

test("nothing is asked across two orderings", async () => {
  await forget();
  // The days and the numbers are two sequences. Standing third in one says
  // nothing about standing anywhere in the other.
  assertEquals(await said("is monday before three?"), "unsure");
  await forget();
});
