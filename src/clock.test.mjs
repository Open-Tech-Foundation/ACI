import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");
const says = async (said) => (await brain(said)).expression.state.says;

test("a clock is a tool, and what it measures is time", async () => {
  await forget();
  assertEquals((await brain("a clock is a tool?")).expression.name, "affirm");
  assertEquals((await brain("a clock measures a time?")).expression.name, "affirm");
  await forget();
});

test("time is counted in the parts the world already held", async () => {
  await forget();
  for (const part of ["second", "minute", "hour", "day", "week", "year"]) {
    assertEquals((await brain(`a ${part} measures a time?`)).expression.name, "affirm", part);
  }
  await forget();
});

test("a clock read is a measure like any other", async () => {
  await forget();
  await brain("a clock reads 10 hour");
  assertEquals(await says("the clock reads how many hours?"), "10");
  await forget();
});

test("a number beside a unit says how much, not how many", async () => {
  await forget();
  // An hour is a period, and a period is a time, and a time is a property —
  // but a number beside a unit is a measure all the same.
  assertEquals((await brain("a clock reads 10 hour")).expression.name, "learn");
  assertEquals((await brain("an apple has three weight")).expression.name, "unsure");
  await forget();
});
