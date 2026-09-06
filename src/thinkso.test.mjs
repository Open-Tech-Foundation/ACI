import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// Told agreement: `i think so` re-offers the last idea as fact — learning
// nothing new where it holds, denying nothing where it was denied.
// Same signals in the same order give the same answers on every machine.

const { brain, forget } = openBrain("sqlite::memory:");

test("think so agrees without taking anything in", async () => {
  await forget();
  await brain("a harmonica is red");
  const r = await brain("i think so", { from: 508 });
  assertEquals(r.expression.name, "understood");
  assertEquals(r.learned, null);
  await forget();
});

test("think so with no idea says nothing", async () => {
  await forget();
  assertEquals((await brain("i think so", { from: 508 })).expression.name, "unknown");
  await forget();
});

test("think so agrees with a denial", async () => {
  await forget();
  await brain("a harmonica is not black");
  const r = await brain("i think so", { from: 508 });
  assertEquals(r.expression.name, "understood");
  assertEquals(r.learned, null);
  await forget();
});
