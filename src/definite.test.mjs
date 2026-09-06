import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// Definite accommodation: `the` with nothing to be the of yet makes one —
// there is no picking where nothing exists. Several, and there is no `the`.
// Same signals in the same order give the same answers on every machine.

const { brain, forget } = openBrain("sqlite::memory:");

test("the with nothing to be takes state in", async () => {
  await forget();
  const told = await brain("the library has 12 books");
  assertEquals(told.expression.name, "learn");
  assertEquals(
    (await brain("the library has how many books?")).expression.state.says,
    "twelve",
  );
  await forget();
});

test("the with several to be picks none", async () => {
  await forget();
  await brain("a library has 1 book");
  await brain("a library has 2 books");
  assertEquals(
    (await brain("the library has how many books?")).expression.name,
    "unsure",
  );
  await forget();
});

test("the reuses the one, a makes another", async () => {
  await forget();
  const first = await brain("the library has 12 books");
  await brain("the library has 10 books");
  const r = await brain("the library has how many books?");
  assertEquals(r.expression.state.says, "ten");
  assertEquals(r.spoken, first.spoken);
  await forget();
});
